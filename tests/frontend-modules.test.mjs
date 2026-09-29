import assert from 'node:assert/strict';


const projectRoot = new URL('../', import.meta.url);


async function loadModule(relativePath) {
  return import(new URL(relativePath, projectRoot));
}


async function testApiConfiguration() {
  const {
    PRODUCTION_API_URL,
    resolveApiBaseUrl,
  } = await loadModule('src/js/config.js');

  assert.equal(resolveApiBaseUrl('localhost'), 'http://localhost:8000');
  assert.equal(resolveApiBaseUrl('127.0.0.1'), 'http://localhost:8000');
  assert.equal(resolveApiBaseUrl('example.github.io'), PRODUCTION_API_URL);
  assert.match(PRODUCTION_API_URL, /^https:\/\//u);
  assert.equal(PRODUCTION_API_URL.includes('localhost'), false);
}


async function testApiModule() {
  const {api} = await loadModule('src/js/api.js');
  const requests = [];

  globalThis.fetch = async (url, options = {}) => {
    requests.push({url, options});

    if (url.endsWith('/api/calculate')) {
      return new Response(
        JSON.stringify({success: true, expression: '1+2', result: 3}),
        {status: 200},
      );
    }

    if (options.method === 'DELETE') {
      return new Response(
        JSON.stringify({success: true, message: 'History record deleted'}),
        {status: 200},
      );
    }

    return new Response(JSON.stringify([]), {status: 200});
  };

  const response = await api.calculate('1+2');
  await api.getHistory();
  await api.deleteHistory(12);

  assert.equal(response.result, 3);
  assert.equal(requests[0].url, 'http://localhost:8000/api/calculate');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.body, '{"expression":"1+2"}');
  assert.equal(requests[1].url, 'http://localhost:8000/api/history');
  assert.equal(requests[2].options.method, 'DELETE');

  globalThis.fetch = async () => new Response(
    JSON.stringify({success: false, message: 'Division by zero'}),
    {status: 400},
  );

  await assert.rejects(
    () => api.calculate('10/0'),
    {message: 'Division by zero'},
  );

  globalThis.fetch = async () => {
    throw new TypeError('Backend offline');
  };

  await assert.rejects(
    () => api.calculate('1+2'),
    {message: '无法连接后端服务'},
  );
}


function createDeferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });

  return {promise, resolve};
}


function createCalculatorDependencies(overrides = {}) {
  const state = {
    calculationErrors: [],
    loadingStates: [],
    results: [],
  };

  return {
    dependencies: {
      api: overrides.api,
      historyController: overrides.historyController,
      keypad: {
        addEventListener() {},
        contains() {
          return true;
        },
      },
      ui: {
        showExpression() {},
        resetResult() {},
        showResult(result) {
          state.results.push(result);
        },
        showResultError(message) {
          state.calculationErrors.push(message);
        },
        setCalculationLoading(isLoading) {
          state.loadingStates.push(isLoading);
        },
      },
    },
    state,
  };
}


async function testPendingCalculationPreventsDuplicateRequest() {
  const {CalculatorController} = await loadModule(
    'src/js/calculator.js',
  );
  const firstCalculation = createDeferred();
  let calculationRequests = 0;
  let keypadListeners = 0;
  let historyRequests = 0;

  const controller = new CalculatorController({
    api: {
      calculate: async () => {
        calculationRequests += 1;
        if (calculationRequests === 1) {
          return firstCalculation.promise;
        }
        return {result: 5};
      },
    },
    historyController: {
      refresh: async () => {
        historyRequests += 1;
      },
    },
    keypad: {
      addEventListener() {
        keypadListeners += 1;
      },
      contains() {
        return true;
      },
    },
    ui: {
      showExpression() {},
      resetResult() {},
      showResult() {},
      showResultError() {},
      setCalculationLoading() {},
    },
  });

  controller.initialize();
  controller.initialize();
  assert.equal(keypadListeners, 1);

  controller.expression = '55+6';
  const firstRequest = controller.requestCalculation();
  const duplicateRequest = controller.requestCalculation();

  assert.equal(calculationRequests, 1);
  assert.equal(controller.isRequesting, true);
  firstCalculation.resolve({result: 61});
  await Promise.all([firstRequest, duplicateRequest]);

  assert.equal(controller.isRequesting, false);
  assert.equal(historyRequests, 1);

  controller.expression = '2+3';
  await controller.requestCalculation();
  assert.equal(calculationRequests, 2);
}


async function testCalculationLoadingDoesNotWaitForHistory() {
  const {CalculatorController} = await loadModule(
    'src/js/calculator.js',
  );
  const historyRefresh = createDeferred();
  let historyStarted = false;
  let historyFinished = false;
  const {dependencies, state} = createCalculatorDependencies({
    api: {
      calculate: async () => ({result: 7.9}),
    },
    historyController: {
      refresh: async () => {
        historyStarted = true;
        await historyRefresh.promise;
        historyFinished = true;
      },
    },
  });
  const controller = new CalculatorController(dependencies);

  controller.expression = '2.3+5.6';
  await controller.requestCalculation();

  assert.deepEqual(state.results, [7.9]);
  assert.deepEqual(state.loadingStates, [true, false]);
  assert.equal(controller.isRequesting, false);
  assert.equal(historyStarted, true);
  assert.equal(historyFinished, false);

  historyRefresh.resolve();
  await historyRefresh.promise;
}


async function testHistoryFailureDoesNotReplaceCalculationResult() {
  const {CalculatorController} = await loadModule(
    'src/js/calculator.js',
  );
  const {HistoryController} = await loadModule('src/js/history.js');
  const historyErrors = [];
  const historyController = new HistoryController({
    api: {
      getHistory: async () => {
        throw new Error('History unavailable');
      },
    },
    ui: {
      showHistoryLoading() {},
      showHistoryError(message) {
        historyErrors.push(message);
      },
      renderHistory() {},
    },
  });
  const {dependencies, state} = createCalculatorDependencies({
    api: {
      calculate: async () => ({result: 3}),
    },
    historyController,
  });
  const controller = new CalculatorController(dependencies);

  controller.expression = '1+2';
  await controller.requestCalculation();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(state.results, [3]);
  assert.deepEqual(state.calculationErrors, []);
  assert.deepEqual(historyErrors, ['History unavailable']);
}


async function testCalculationFailureRemainsCalculatorError() {
  const {CalculatorController} = await loadModule(
    'src/js/calculator.js',
  );
  let historyRequests = 0;
  const {dependencies, state} = createCalculatorDependencies({
    api: {
      calculate: async () => {
        throw new Error('Division by zero');
      },
    },
    historyController: {
      refresh: async () => {
        historyRequests += 1;
      },
    },
  });
  const controller = new CalculatorController(dependencies);

  controller.expression = '10/0';
  await controller.requestCalculation();

  assert.deepEqual(state.results, []);
  assert.deepEqual(state.calculationErrors, ['Division by zero']);
  assert.deepEqual(state.loadingStates, [true, false]);
  assert.equal(historyRequests, 0);
}


async function testHistoryRequestCounts() {
  const {HistoryController} = await loadModule('src/js/history.js');
  let historyRequests = 0;
  let deleteRequests = 0;
  let deleteHandler;

  const controller = new HistoryController({
    api: {
      getHistory: async () => {
        historyRequests += 1;
        return [];
      },
      deleteHistory: async () => {
        deleteRequests += 1;
      },
    },
    ui: {
      showHistoryLoading() {},
      showHistoryError(message) {
        throw new Error(message);
      },
      renderHistory(_records, onDelete) {
        deleteHandler = onDelete;
      },
    },
  });

  await controller.initialize();
  await controller.initialize();
  assert.equal(historyRequests, 1);

  await controller.refresh();
  assert.equal(historyRequests, 2);

  await deleteHandler(1);
  assert.equal(deleteRequests, 1);
  assert.equal(historyRequests, 3);
}


await testApiConfiguration();
await testApiModule();
await testPendingCalculationPreventsDuplicateRequest();
await testCalculationLoadingDoesNotWaitForHistory();
await testHistoryFailureDoesNotReplaceCalculationResult();
await testCalculationFailureRemainsCalculatorError();
await testHistoryRequestCounts();

console.log('Frontend module tests: 7 passed, 0 failed');
