import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { getApiBaseUrl } from '@/lib/env';

/**
 * API Proxy Route
 * Forwards client-side requests to the backend API,
 * automatically attaching the HttpOnly access token.
 */
export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}

async function proxyRequest(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Strip /api/proxy prefix
  const upstreamPath = pathname.replace(/^\/api\/proxy/, '');
  const upstreamUrl = `${getApiBaseUrl()}${upstreamPath}${search}`;

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  const headers = new Headers(request.headers);
  headers.set('host', new URL(getApiBaseUrl()).host);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Next.js fetch doesn't handle some headers well when forwarding
  headers.delete('connection');
  headers.delete('content-length');

  try {
    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body:
        request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : undefined,
      cache: 'no-store',
      // @ts-expect-error - duplex is required for streaming bodies in some versions
      duplex: 'half',
    });

    const body = await response.blob();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to reach upstream API' } },
      { status: 502 },
    );
  }
}
