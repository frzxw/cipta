import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE } from './lib/auth/cookies';

const AUTH_ROUTES = ['/login', '/register'];
const PUBLIC_ASSETS = /\.(ico|png|jpg|jpeg|svg|webp|avif|gif|css|js|map|txt|woff2?)$/i;

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes (API handles its own auth).
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    PUBLIC_ASSETS.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasAccessToken = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isAuthRoute && hasAccessToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (!isAuthRoute && !hasAccessToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
