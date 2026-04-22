import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearedAccessCookie,
  clearedRefreshCookie,
} from '../../../../lib/auth/cookies';
import { getApiBaseUrl } from '../../../../lib/env';

export const runtime = 'nodejs';

export async function POST(): Promise<NextResponse> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await fetch(`${getApiBaseUrl()}/auth/logout`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${refreshToken}`,
        },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });
    } catch {
      // Best-effort; always clear local cookies.
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ACCESS_COOKIE, '', clearedAccessCookie());
  response.cookies.set(REFRESH_COOKIE, '', clearedRefreshCookie());
  return response;
}
