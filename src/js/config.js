const LOCAL_API_URL = 'http://localhost:8000';

export const PRODUCTION_API_URL =
  'https://calculator-backend-1m81.onrender.com';

const LOCAL_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
]);

export function resolveApiBaseUrl(
  hostname = globalThis.location?.hostname ?? 'localhost',
) {
  if (LOCAL_HOSTNAMES.has(hostname)) {
    return LOCAL_API_URL;
  }

  return PRODUCTION_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();
