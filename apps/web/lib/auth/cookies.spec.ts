import { describe, expect, it } from 'vitest';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  clearedAccessCookie,
  clearedRefreshCookie,
  refreshCookieOptions,
} from './cookies';

describe('cookie options', () => {
  it('exports distinct cookie names', () => {
    expect(ACCESS_COOKIE).toBe('cipta_access');
    expect(REFRESH_COOKIE).toBe('cipta_refresh');
    expect(ACCESS_COOKIE).not.toBe(REFRESH_COOKIE);
  });

  it('builds httpOnly access cookie with lax sameSite', () => {
    const opts = accessCookieOptions(900);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(900);
  });

  it('scopes refresh cookie to /api/auth', () => {
    const opts = refreshCookieOptions(604800);
    expect(opts.path).toBe('/api/auth');
    expect(opts.httpOnly).toBe(true);
    expect(opts.maxAge).toBe(604800);
  });

  it('clears cookies by zeroing maxAge', () => {
    expect(clearedAccessCookie().maxAge).toBe(0);
    expect(clearedRefreshCookie().maxAge).toBe(0);
  });
});
