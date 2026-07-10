// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken');
  const refreshToken = request.cookies.get('refreshToken');
  const isLoggedIn = !!(accessToken || refreshToken);

  const path = request.nextUrl.pathname;

  if (path.startsWith('/dashboard') || path.startsWith('/projects')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (path === '/login' || path === '/signup') {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/projects', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/login',
    '/signup',
  ],
};