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

async function requestCsv(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(text || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return text;
}

export const api = {
  // Dashboard
  getDashboard: () => request('GET', '/dashboard'),

  // Products
  getProducts: (includeInactive = false) => request('GET', `/products${includeInactive ? '?include_inactive=1' : ''}`),
  createProduct: (body) => request('POST', '/products', body),
  deleteProduct: (id) => request('DELETE', `/products/${id}`),
  restoreProduct: (id) => request('POST', `/products/${id}/restore`),

  // Batches
  getBatches: (productId) =>
    request('GET', '/batches' + (productId ? `?product_id=${String(productId)}` : '')),
  createBatch: (body) => request('POST', '/batches', body),

  // Units
  getUnits: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();
    return request('GET', `/units${qs ? `?${qs}` : ''}`);
  },
  exportUnitsCsv: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();
    return requestCsv(`/units/export.csv${qs ? `?${qs}` : ''}`);
  },
  getUnitLabel: (id) => request('GET', `/units/${id}/label`),
  forceUnitStatus: (id, body) => request('POST', `/units/${id}/force`, body),
  getPrintJobs: (onlyFailed = false) => request('GET', `/units/print-jobs${onlyFailed ? '?only_failed=1' : ''}`),
  logPrintJob: (body) => request('POST', '/units/print-jobs', body),
  generateUnits: (body) => request('POST', '/units/generate', body),

  // Scanning
  scanOut: (unit_id, note, foreman_id, project_id) => request('POST', '/scan/out', { unit_id, note, foreman_id, project_id }),
  scanIn: (unit_id, note, foreman_id, as_used = false) => request('POST', '/scan/in', { unit_id, note, foreman_id, as_used }),

  // Foremen
  getForemen: (includeInactive = false) => request('GET', `/foremen${includeInactive ? '?include_inactive=1' : ''}`),
  createForeman: (body) => request('POST', '/foremen', body),
  deleteForeman: (id) => request('DELETE', `/foremen/${id}`),
  restoreForeman: (id) => request('POST', `/foremen/${id}/restore`),

  // Projects
  getProjects: (includeInactive = false) => request('GET', `/projects${includeInactive ? '?include_inactive=1' : ''}`),
  createProject: (body) => request('POST', '/projects', body),
  deleteProject: (id) => request('DELETE', `/projects/${id}`),
  restoreProject: (id) => request('POST', `/projects/${id}/restore`),

  // Tickets
  getTickets: (status = 'OPEN', filters = {}) => {
    const qs = new URLSearchParams({ status, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')) }).toString();
    return request('GET', `/tickets?${qs}`);
  },
  closeTicket: (id, note) => request('PATCH', `/tickets/${id}/close`, { note }),
  reopenTicket: (id) => request('PATCH', `/tickets/${id}/reopen`),
  mergeTickets: (body) => request('POST', '/tickets/merge', body),
  splitTicket: (id, body) => request('POST', `/tickets/${id}/split`, body),
};
