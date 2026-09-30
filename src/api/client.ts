import { AuthTokens } from '../types';

const API_BASE_URL: string = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5101';
const TOKENS_KEY = 'jobcharcha.tokens';

export class ApiError extends Error {
  status: number;
  errorCode?: string;

  constructor(status: number, message: string, errorCode?: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

export function getStoredTokens(): AuthTokens | null {
  const raw = localStorage.getItem(TOKENS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: AuthTokens | null) {
  if (tokens) {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } else {
    localStorage.removeItem(TOKENS_KEY);
  }
}

let refreshInFlight: Promise<AuthTokens | null> | null = null;

async function refreshTokens(): Promise<AuthTokens | null> {
  const current = getStoredTokens();
  if (!current?.refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          setStoredTokens(null);
          return null;
        }
        const data = await res.json();
        const tokens: AuthTokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
        };
        setStoredTokens(tokens);
        localStorage.setItem('jobcharcha.user', JSON.stringify(data.user));
        return tokens;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  isFormData?: boolean;
  /** ms before the request is aborted. Default 20s — plain fetch() has no timeout of its
   * own, so a stuck backend/DB connection would otherwise hang this promise forever and
   * every downstream .catch() fallback would never fire. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'The server took too long to respond. Please check your connection and try again.', 'timeout');
    }
    throw new ApiError(0, 'Could not reach the server. Please check your connection and try again.', 'network_error');
  } finally {
    clearTimeout(timer);
  }
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, isFormData = false, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';

    if (auth) {
      const tokens = getStoredTokens();
      if (tokens?.accessToken) headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    return fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    }, timeoutMs);
  };

  let response = await doFetch();

  if (response.status === 401 && auth) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      response = await doFetch();
    }
  }

  if (!response.ok) {
    let errorCode: string | undefined;
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      errorCode = data.errorCode;
      // ASP.NET ValidationProblemDetails: surface the field-level messages instead of the generic title.
      const fieldErrors =
        data.errors && typeof data.errors === 'object'
          ? (Object.values(data.errors) as unknown[]).flat().filter((m): m is string => typeof m === 'string')
          : [];
      message = fieldErrors.length ? fieldErrors.join(' ') : data.error || data.title || message;
    } catch {
      // no JSON body
    }
    throw new ApiError(response.status, message, errorCode);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/// Plain `apiFetch` always parses the response as JSON, so a CSV/file download needs its own
/// authenticated fetch that reads a Blob instead and triggers the browser's save-file flow.
export async function downloadAuthenticatedFile(path: string, filename: string): Promise<void> {
  const tokens = getStoredTokens();
  const headers: Record<string, string> = {};
  if (tokens?.accessToken) headers['Authorization'] = `Bearer ${tokens.accessToken}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    let message = `Download failed with status ${response.status}`;
    try { message = (await response.json()).error || message; } catch { /* no JSON body */ }
    throw new ApiError(response.status, message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function toQueryString(params: object): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export { API_BASE_URL };
