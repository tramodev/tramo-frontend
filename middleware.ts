// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Backs the public-project view counter's per-visitor dedup for anonymous
// visitors (logged-in visitors dedup by user id instead) — see
// lib/public-project.ts and mypath-backend's ProjectView entity.
const ANON_ID_COOKIE = 'mypath_anon_id';

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken');
  const refreshToken = request.cookies.get('refreshToken');
  const isLoggedIn = !!(accessToken || refreshToken);

  const path = request.nextUrl.pathname;

  if (path.startsWith('/dashboard') || path.startsWith('/projects') || path.startsWith('/profile')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (path === '/login' || path === '/signup') {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/projects', request.url));
    }
  }

  if (path.startsWith('/p/') && !request.cookies.get(ANON_ID_COOKIE)) {
    const anonId = crypto.randomUUID();
    // Forwarded on the request too, so this same first-visit render can
    // already read it via cookies() instead of only the next navigation.
    request.cookies.set(ANON_ID_COOKIE, anonId);
    const response = NextResponse.next({ request });
    response.cookies.set(ANON_ID_COOKIE, anonId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/profile/:path*',
    '/login',
    '/signup',
    '/p/:path*',
  ],
};