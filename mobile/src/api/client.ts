import { getApiUrl } from '../config';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  code: number;
  message: string;
  data: T;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  json?: unknown;
  formData?: FormData;
  token?: string | null;
  timeoutMs?: number;
}

let authToken: string | null = null;

export function setApiToken(token: string | null): void {
  authToken = token;
}

export function isUnauthorized(e: unknown): boolean {
  return e instanceof ApiError && e.status === 401;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const base = getApiUrl();
  const url = `${base}${path.startsWith('/') ? path : '/' + path}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.json !== undefined) headers['Content-Type'] = 'application/json';
  const token = options.token ?? authToken;
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? (options.json !== undefined || options.formData ? 'POST' : 'GET'),
      headers,
      body: options.formData ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ApiError(0, 'Waktu koneksi habis. Periksa internet/server.');
    }
    throw new ApiError(0, 'Tidak dapat terhubung ke server. Periksa URL API & koneksi internet.');
  } finally {
    clearTimeout(timer);
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await res.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!res.ok || !payload) {
    throw new ApiError(res.status, payload?.message || `Server error (HTTP ${res.status})`);
  }

  return payload.data;
}
