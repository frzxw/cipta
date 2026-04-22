import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  DEFAULT_TOKEN_TTL,
} from './cookies';
import { getApiBaseUrl } from '../env';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

interface AuthEnvelope<T> {
  success: boolean;
  data?: T & { tokens: AuthTokens };
  error?: { code?: string; message: string };
}

export interface AuthResponseData {
  user: unknown;
  workspace: unknown;
  tokens: AuthTokens;
}

export async function proxyAuthRequest(
  path: '/auth/login' | '/auth/register',
  body: unknown,
): Promise<NextResponse> {
  const upstreamUrl = `${getApiBaseUrl()}${path}`;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Unable to reach auth service' } },
      { status: 502 },
    );
  }

  const payload = (await upstreamResponse
    .json()
    .catch(() => null)) as AuthEnvelope<AuthResponseData> | null;

  if (!upstreamResponse.ok || !payload?.success || !payload.data) {
    const message = payload?.error?.message ?? 'Authentication failed';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: upstreamResponse.status || 400 },
    );
  }

  const { tokens, ...rest } = payload.data;
  const store = await cookies();
  const accessTtl = tokens.expiresIn ?? DEFAULT_TOKEN_TTL.access;

  store.set(ACCESS_COOKIE, tokens.accessToken, accessCookieOptions(accessTtl));
  store.set(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions(DEFAULT_TOKEN_TTL.refresh));

  // Do not leak tokens to the client; return only user + workspace.
  return NextResponse.json({ success: true, data: rest }, { status: upstreamResponse.status });
}
