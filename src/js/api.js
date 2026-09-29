const API_ENDPOINT = '/api/calculate';

/**
 * Sends an expression to the backend calculation API.
 * This module intentionally performs no mathematical calculation.
 */
async function calculate(expression) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({expression}),
  });

  if (!response.ok) {
    throw new Error(`请求失败（HTTP ${response.status}）`);
  }

  return response.json();
}

export const api = {calculate};
