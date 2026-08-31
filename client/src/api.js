const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function register(username, password) {
  return request('/register', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function login(username, password) {
  return request('/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}
