import { getApiBaseUrl } from './env';

/**
 * Isomorphic API client that handles token injection and routing.
 * - On client: fetches via /api/proxy (Next.js route) to use httpOnly cookies.
 * - On server: fetches directly from API base URL, manually attaching cookies if available.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isServer = typeof window === 'undefined';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  let url: string;
  const finalOptions = { ...options };

  if (isServer) {
    // Running on server (Server Component or Server Action)
    url = `${getApiBaseUrl()}/${cleanPath}`;

    // Inject cookies if running on the server to maintain session
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    if (allCookies.length > 0) {
      const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');

      const headers = new Headers(finalOptions.headers);
      headers.set('Cookie', cookieHeader);

      // If we have an access token cookie, we can also set the Authorization header directly
      // to avoid an extra hop or if the upstream doesn't use the cookie directly.
      const accessToken = cookieStore.get('cipta_access')?.value;
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      finalOptions.headers = headers;
    }
  } else {
    // Running on browser
    url = `/api/proxy/${cleanPath}`;
  }

  const response = await fetch(url, finalOptions);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.error?.message || response.statusText;
    throw new ApiError(message, response.status, errorBody);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Helper for typed API calls
 */
export const api = {
  get: <T>(path: string, options?: RequestInit) => apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      ...options,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
