import {API_BASE_URL} from './config.js';

export {API_BASE_URL};

export class ApiError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new ApiError('Unable to connect to the server');
  }

  const responseBody = await readJson(response);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(responseBody, response.status),
      response.status,
    );
  }

  if (responseBody === null) {
    throw new ApiError('The server returned an invalid response', response.status);
  }

  return responseBody;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(responseBody, status) {
  if (typeof responseBody?.message === 'string') {
    return responseBody.message;
  }

  if (typeof responseBody?.detail === 'string') {
    return responseBody.detail;
  }

  if (Array.isArray(responseBody?.detail)) {
    const validationMessage = responseBody.detail
      .map((item) => item?.msg)
      .find((message) => typeof message === 'string');

    if (validationMessage) {
      return validationMessage;
    }
  }

  return `Request failed (HTTP ${status})`;
}

async function calculate(expression) {
  return request('/api/calculate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({expression}),
  });
}

async function getHistory() {
  const history = await request('/api/history');

  if (!Array.isArray(history)) {
    throw new ApiError('The server returned invalid history data');
  }

  return history;
}

async function deleteHistory(id) {
  return request(`/api/history/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export const api = {
  calculate,
  getHistory,
  deleteHistory,
};
