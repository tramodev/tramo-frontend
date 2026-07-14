// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { API_BASE_URL } from '@/lib/config';

// Backs the public-project view counter's per-visitor dedup for anonymous
// visitors (logged-in visitors dedup by user id instead) — see
// lib/public-project.ts and mypath-backend's ProjectView entity.
const ANON_ID_COOKIE = 'mypath_anon_id';

const ACCESS_TOKEN_MAX_AGE = 60 * 15;
const REFRESH_MARGIN_SECONDS = 60;

// Server Components can't refresh the access token mid-render (cookies() is
// read-only there — see the comment in lib/profile.ts), so every profile/
// stats/bookmarks/etc read on a page like /profile just silently 401s once
// the 15-minute access token expires, and the page falls back to an empty
// state instead of erroring. Refreshing here, before the page renders at all,
// is what actually fixes that instead of papering over it downstream.
function isExpiringSoon(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 - Date.now() < REFRESH_MARGIN_SECONDS * 1000;
  } catch {
    return true;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}

async function isAdminUser(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.role === 'ADMIN';
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith('/editor') || path.startsWith('/projects') || path.startsWith('/profile') || path.startsWith('/admin');

  let accessToken = request.cookies.get('accessToken')?.value ?? null;
  const refreshToken = request.cookies.get('refreshToken')?.value ?? null;
  let refreshedAccessToken: string | null = null;

  if (isProtected && refreshToken && (!accessToken || isExpiringSoon(accessToken))) {
    refreshedAccessToken = await refreshAccessToken(refreshToken);
    if (refreshedAccessToken) {
      accessToken = refreshedAccessToken;
    }
  }

  const isLoggedIn = !!(accessToken || refreshToken);

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const needsAdminCheck = isLoggedIn && !!accessToken && (path.startsWith('/projects') || path === '/login' || path === '/signup');
  const admin = needsAdminCheck && accessToken ? await isAdminUser(accessToken) : false;

  if (path.startsWith('/projects') && admin) {
    return NextResponse.redirect(new URL('/explore', request.url));
  }

  if ((path === '/login' || path === '/signup') && isLoggedIn) {
    return NextResponse.redirect(new URL(admin ? '/explore' : '/projects', request.url));
  }

  const needsAnonId = path.startsWith('/p/') && !request.cookies.get(ANON_ID_COOKIE);
  const anonId = needsAnonId ? crypto.randomUUID() : null;

  // Forwarded on the request too, so this same first-visit render can already
  // read it via cookies() instead of only the next navigation.
  if (anonId) request.cookies.set(ANON_ID_COOKIE, anonId);
  if (refreshedAccessToken) request.cookies.set('accessToken', refreshedAccessToken);

  const response = NextResponse.next({ request });

  if (anonId) {
    response.cookies.set(ANON_ID_COOKIE, anonId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  if (refreshedAccessToken) {
    response.cookies.set('accessToken', refreshedAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/editor/:path*',
    '/projects/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
    '/p/:path*',
  ],
};
