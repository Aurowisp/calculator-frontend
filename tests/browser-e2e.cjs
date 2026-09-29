const assert = require('node:assert/strict');


const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:5500/src/index.html';
const DEBUG_URL = 'http://127.0.0.1:9222/json/list';


function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}


async function connectToCalculatorPage() {
  const targets = await fetch(DEBUG_URL).then((response) => response.json());
  const target = targets.find(
    (item) => item.type === 'page' && item.url === FRONTEND_URL,
  );
  assert.ok(target, 'Calculator browser target not found');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, {once: true});
    socket.addEventListener('error', reject, {once: true});
  });
  return socket;
}


function createCdpClient(socket) {
  let nextId = 0;
  const pending = new Map();
  const requests = [];
  const consoleErrors = [];

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);

    if (message.id && pending.has(message.id)) {
      const {resolve, reject} = pending.get(message.id);
      pending.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
      return;
    }

    if (message.method === 'Network.requestWillBeSent') {
      requests.push({
        method: message.params.request.method,
        url: message.params.request.url,
      });
    }

    if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(message.params.exceptionDetails.text);
    }

    if (
      message.method === 'Runtime.consoleAPICalled'
      && message.params.type === 'error'
    ) {
      consoleErrors.push('console.error');
    }

  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, {resolve, reject});
      socket.send(JSON.stringify({id, method, params}));
    });
  }

  async function evaluate(expression) {
    const response = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });

    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.text);
    }
    return response.result.value;
  }

  async function waitFor(expression, label) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (await evaluate(expression)) {
        return;
      }
      await sleep(100);
    }
    throw new Error(`Timed out waiting for ${label}`);
  }

  return {consoleErrors, evaluate, requests, send, waitFor};
}


async function clickExpression(client, expression, doubleSubmit = false) {
  await client.evaluate(`(() => {
    document.querySelector('[data-action="clear"]').click();
    for (const character of ${JSON.stringify(expression)}) {
      const button = [...document.querySelectorAll('[data-value]')]
        .find((item) => item.dataset.value === character);
      if (!button) throw new Error('Missing button: ' + character);
      button.click();
    }
    const equals = document.querySelector('[data-action="calculate"]');
    equals.click();
    if (${doubleSubmit}) equals.click();
  })()`);
}


async function deleteExpression(client, expression) {
  return client.evaluate(`(() => {
    const item = [...document.querySelectorAll('.history__item')]
      .find((element) => (
        element.querySelector('.history__expression')?.textContent
          === ${JSON.stringify(expression)}
      ));
    if (!item) return false;
    item.querySelector('.history__delete').click();
    return true;
  })()`);
}


function countRequests(requests, method, url) {
  return requests.filter(
    (request) => request.method === method && request.url === url,
  ).length;
}


async function cleanupCreatedHistory(baselineIds) {
  const response = await fetch(`${BACKEND_URL}/api/history`);
  const currentHistory = await response.json();
  const createdRecords = currentHistory.filter(
    (record) => !baselineIds.has(record.id),
  );

  for (const record of createdRecords) {
    await fetch(`${BACKEND_URL}/api/history/${record.id}`, {
      method: 'DELETE',
    });
  }

  return createdRecords.length;
}


async function run() {
  const baselineResponse = await fetch(`${BACKEND_URL}/api/history`);
  const baselineHistory = await baselineResponse.json();
  const baselineIds = new Set(baselineHistory.map((record) => record.id));
  let socket;

  try {
    socket = await connectToCalculatorPage();
    const client = createCdpClient(socket);
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Page.enable');

    client.requests.length = 0;
    await client.send('Page.reload', {ignoreCache: true});
    await client.waitFor(
      `document.readyState === 'complete'
        && !document.querySelector('.history__empty')
          ?.textContent.includes('正在加载')`,
      'initial history load',
    );
    await sleep(300);
    assert.equal(
      countRequests(
        client.requests,
        'GET',
        `${BACKEND_URL}/api/history`,
      ),
      1,
      'Page load should make one history GET',
    );

    client.requests.length = 0;
    await clickExpression(client, '55+6', true);
    await client.waitFor(
      `document.querySelector('#result-display').textContent === '61'`,
      '55+6 result',
    );
    await client.waitFor(
      `[...document.querySelectorAll('.history__expression')]
        .some((item) => item.textContent === '55+6')`,
      '55+6 history',
    );
    await sleep(300);
    assert.equal(
      countRequests(
        client.requests,
        'POST',
        `${BACKEND_URL}/api/calculate`,
      ),
      1,
      'Rapid equals clicks should make one POST',
    );
    assert.equal(
      countRequests(
        client.requests,
        'GET',
        `${BACKEND_URL}/api/history`,
      ),
      1,
      'Successful calculation should make one history GET',
    );

    client.requests.length = 0;
    await clickExpression(client, '1+*2');
    await client.waitFor(
      `document.querySelector('#result-display').textContent
        === 'Invalid expression'`,
      'invalid expression error',
    );
    assert.equal(
      countRequests(
        client.requests,
        'GET',
        `${BACKEND_URL}/api/history`,
      ),
      0,
      'Failed calculation should not reload history',
    );

    await clickExpression(client, '10/0');
    await client.waitFor(
      `document.querySelector('#result-display').textContent
        === 'Division by zero'`,
      'division by zero error',
    );

    await clickExpression(client, '123+456');
    await client.waitFor(
      `document.querySelector('#result-display').textContent === '579'`,
      'persistence result',
    );
    await client.waitFor(
      `[...document.querySelectorAll('.history__expression')]
        .some((item) => item.textContent === '123+456')`,
      'persistence history',
    );

    client.requests.length = 0;
    await client.send('Page.reload', {ignoreCache: true});
    await client.waitFor(
      `[...document.querySelectorAll('.history__expression')]
        .some((item) => item.textContent === '123+456')`,
      'history after frontend refresh',
    );
    await sleep(300);
    assert.equal(
      countRequests(
        client.requests,
        'GET',
        `${BACKEND_URL}/api/history`,
      ),
      1,
      'Frontend refresh should make one history GET',
    );

    client.requests.length = 0;
    assert.equal(await deleteExpression(client, '55+6'), true);
    await client.waitFor(
      `![...document.querySelectorAll('.history__expression')]
        .some((item) => item.textContent === '55+6')`,
      'history deletion',
    );
    await sleep(300);
    assert.equal(
      client.requests.filter(
        (request) => (
          request.method === 'DELETE'
          && request.url.startsWith(`${BACKEND_URL}/api/history/`)
        ),
      ).length,
      1,
      'Delete action should make one DELETE',
    );
    assert.equal(
      countRequests(
        client.requests,
        'GET',
        `${BACKEND_URL}/api/history`,
      ),
      1,
      'Delete action should make one history GET',
    );

    await client.send('Network.emulateNetworkConditions', {
      connectionType: 'none',
      downloadThroughput: 0,
      latency: 0,
      offline: true,
      uploadThroughput: 0,
    });
    try {
      await clickExpression(client, '1+2');
      await client.waitFor(
        `document.querySelector('#result-display').textContent
          === '无法连接后端服务'`,
        'offline backend error',
      );
      assert.equal(
        await client.evaluate(
          `document.querySelector('#expression-display').textContent`,
        ),
        '1+2',
      );
      await client.evaluate(
        `document.querySelector('[data-action="clear"]').click()`,
      );
      assert.equal(
        await client.evaluate(
          `document.querySelector('#expression-display').textContent`,
        ),
        '0',
        'Calculator UI should remain interactive while offline',
      );
    } finally {
      await client.send('Network.emulateNetworkConditions', {
        connectionType: 'wifi',
        downloadThroughput: -1,
        latency: 0,
        offline: false,
        uploadThroughput: -1,
      });
    }

    assert.deepEqual(
      client.consoleErrors,
      [],
      `Browser errors: ${client.consoleErrors.join(', ')}`,
    );

    return {
      calculationHistoryGet: 1,
      calculationPost: 1,
      consoleErrors: client.consoleErrors.length,
      deleteHistoryGet: 1,
      deleteRequest: 1,
      initialHistoryGet: 1,
      offlineFallbackResult: false,
      offlineUiInteractive: true,
    };
  } finally {
    if (socket) {
      socket.close();
    }
    const removedRecords = await cleanupCreatedHistory(baselineIds);
    console.log(`Browser test cleanup: removed ${removedRecords} records`);
  }
}


run()
  .then((result) => {
    console.log('Browser E2E passed:', JSON.stringify(result));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
