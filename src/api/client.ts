// In dev, use relative /api so the React dev server proxy (see package.json "proxy") forwards to backend.
const API_BASE = process.env.REACT_APP_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('cloudbot_token');
}

export async function request<T>(
  path: string,
  options: { method?: string; headers?: HeadersInit; body?: unknown } = {}
): Promise<{ success: boolean; data?: T; message?: string }> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const bodyStr: string | undefined = options.body !== undefined ? JSON.stringify(options.body) : undefined;
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method,
    headers,
    body: bodyStr,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || res.statusText || 'Request failed');
  return json;
}

export async function uploadFile(path: string, file: File): Promise<{ success: boolean; data?: unknown; message?: string }> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || res.statusText || 'Upload failed');
  return json;
}

/** RAG vector upload: file and/or url (FormData). */
export async function uploadRagDocument(
  path: string,
  opts: { file?: File | null; url?: string }
): Promise<{ success: boolean; data?: unknown; message?: string }> {
  const token = getToken();
  const form = new FormData();
  if (opts.file) form.append('file', opts.file);
  if (opts.url?.trim()) form.append('url', opts.url.trim());
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch (err) {
    // Any network error (fetch failed, connection refused, etc.) → show clear message
    throw new Error(
      'Cannot reach the backend. Start it in a terminal: cd backend && npm run dev — then try again.'
    );
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || res.statusText || 'Upload failed');
  return json;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
