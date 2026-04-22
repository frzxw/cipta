import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export const ACCESS_COOKIE = 'cipta_access';
export const REFRESH_COOKIE = 'cipta_refresh';

const isProd = process.env.NODE_ENV === 'production';

export function accessCookieOptions(maxAgeSeconds: number): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

// Refresh cookie is scoped to auth endpoints so it's only sent on refresh/logout.
export function refreshCookieOptions(maxAgeSeconds: number): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: maxAgeSeconds,
  };
}

// maxAge 0 => clear cookie.
export function clearedAccessCookie(): Partial<ResponseCookie> {
  return { ...accessCookieOptions(0), maxAge: 0 };
}

export function clearedRefreshCookie(): Partial<ResponseCookie> {
  return { ...refreshCookieOptions(0), maxAge: 0 };
}

const DEFAULT_ACCESS_TTL = 15 * 60; // 15 minutes
const DEFAULT_REFRESH_TTL = 7 * 24 * 60 * 60; // 7 days

export const DEFAULT_TOKEN_TTL = {
  access: DEFAULT_ACCESS_TTL,
  refresh: DEFAULT_REFRESH_TTL,
};
