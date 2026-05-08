/**
 * Centralised API client.
 * In local dev, requests go through /api (Vite proxy).
 * In production, set VITE_API_BASE_URL to your deployed backend URL.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  // Dashboard
  getDashboard: () => request('GET', '/dashboard'),

  // Products
  getProducts: () => request('GET', '/products'),
  createProduct: (body) => request('POST', '/products', body),

  // Batches
  getBatches: (productId) =>
    request('GET', `/batches${productId ? `?product_id=${productId}` : ''}`),
  createBatch: (body) => request('POST', '/batches', body),

  // Units
  getUnits: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();
    return request('GET', `/units${qs ? `?${qs}` : ''}`);
  },
  generateUnits: (body) => request('POST', '/units/generate', body),

  // Scanning
  scanOut: (unit_id, note, foreman_id, project_id) => request('POST', '/scan/out', { unit_id, note, foreman_id, project_id }),
  scanIn: (unit_id, note, foreman_id, as_used = false) => request('POST', '/scan/in', { unit_id, note, foreman_id, as_used }),

  // Foremen
  getForemen: () => request('GET', '/foremen'),
  createForeman: (body) => request('POST', '/foremen', body),
  deleteForeman: (id) => request('DELETE', `/foremen/${id}`),

  // Projects
  getProjects: () => request('GET', '/projects'),
  createProject: (body) => request('POST', '/projects', body),
  deleteProject: (id) => request('DELETE', `/projects/${id}`),

  // Tickets
  getTickets: (status = 'OPEN') => request('GET', `/tickets?status=${status}`),
  closeTicket: (id, note) => request('PATCH', `/tickets/${id}/close`, { note }),
};
