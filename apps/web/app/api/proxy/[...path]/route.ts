import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE } from '../../../../lib/auth/cookies';
import { getApiBaseUrl } from '../../../../lib/env';

export const runtime = 'nodejs';

/**
 * Proxy API requests to the upstream NestJS API.
 * Attaches the httpOnly access token as a Bearer token.
 */
async function handleProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const upstreamUrl = `${getApiBaseUrl()}/${path.join('/')}${request.nextUrl.search}`;

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  const headers = new Headers(request.headers);

  // Remove headers that might interfere with upstream
  headers.delete('host');
  headers.delete('connection');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.body,
      // @ts-expect-error - 'duplex' is required for streaming request bodies in Node.js fetch
      duplex: 'half',
    });

    // Return the upstream response as-is to the client
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: upstreamResponse.headers,
    });
  } catch (error) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to reach upstream API' } },
      { status: 502 },
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
