const browserHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const localHosts = new Set(['localhost', '127.0.0.1']);
const defaultApiBase = browserHost && !localHosts.has(browserHost)
  ? 'https://batloung-api.onrender.com/api'
  : 'http://localhost:5000/api';
const API_BASE = (import.meta.env.VITE_API_URL || defaultApiBase).replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new Error('Cannot reach the API. Make sure the backend server is running on port 5000.');
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.message || body.error || `Request failed (HTTP ${response.status})`);
  }
  return body;
}

export function extractList(data, keys = ['data']) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const key of keys) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return [];
}

export default apiRequest;
