/**
 * @file src/middleware.ts
 * @description Next.js App Router Middleware Authentication & Session Guard.
 * 
 * Enforces session token verification across protected dashboard routes.
 * Unauthenticated users are redirected to `/login`. Authenticated users
 * visiting `/login` or `/` are automatically redirected to `/dashboard`.
 * 
 * @module Middleware
 */

import { NextResponse, type NextRequest } from 'next/server';

/** Array of protected dashboard route paths requiring authentication */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/inventory',
  '/stockin',
  '/requests',
  '/challans',
  '/inwards',
  '/returns',
  '/destinations',
  '/ledger',
  '/reports',
  '/users',
  '/audit',
  '/settings',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check for better-auth session cookie (supports secure HTTPS & HTTP cookie names)
  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ||
    request.cookies.get('__Secure-better-auth.session_token')?.value;

  const isAuthenticated = Boolean(sessionToken);

  // 2. Redirect root path `/` to `/dashboard` if authenticated, or `/login` if unauthenticated
  if (pathname === '/') {
    const targetUrl = isAuthenticated ? '/dashboard' : '/login';
    return NextResponse.redirect(new URL(targetUrl, request.url));
  }

  // 3. Unauthenticated access guard for protected dashboard routes
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !isAuthenticated) {
    console.log(`[MIDDLEWARE] Unauthenticated access attempt to ${pathname}. Redirecting to /login`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Authenticated access guard for login page (redirect to dashboard)
  if (pathname === '/login' && isAuthenticated) {
    console.log('[MIDDLEWARE] Active session detected on /login. Redirecting to /dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/inventory/:path*',
    '/stockin/:path*',
    '/requests/:path*',
    '/challans/:path*',
    '/inwards/:path*',
    '/returns/:path*',
    '/destinations/:path*',
    '/ledger/:path*',
    '/reports/:path*',
    '/users/:path*',
    '/audit/:path*',
    '/settings/:path*',
  ],
};
