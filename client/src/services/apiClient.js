const rawBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
const API_BASE = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`;

export async function apiClient(endpoint, options = {}) {
  const { body, headers = {}, ...customOptions } = options;
  const token = localStorage.getItem('hms_token');

  const isFormData = body instanceof FormData;

  const config = {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      'X-Tunnel-Skip-Anti-Abuse': 'true',
      ...headers,
    },
    credentials: 'include', // sends HTTP-only cookies
    ...customOptions,
  };

  if (body) {
    config.body = isFormData ? body : (typeof body === 'string' ? body : JSON.stringify(body));
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, config);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export default apiClient;

