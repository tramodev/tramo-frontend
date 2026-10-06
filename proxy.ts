// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { API_BASE_URL, REFRESH_TOKEN_MAX_AGE } from '@/lib/config';

const ANON_ID_COOKIE = 'tramo_anon_id';

const ACCESS_TOKEN_MAX_AGE = 60 * 15;
const REFRESH_MARGIN_SECONDS = 60;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isExpiringSoon(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  if (typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 - Date.now() < REFRESH_MARGIN_SECONDS * 1000;
}

function getRole(token: string): string | null {
  const role = decodeJwtPayload(token)?.role;
  return typeof role === 'string' ? role : null;
}

function needsBirthDate(token: string): boolean {
  return decodeJwtPayload(token)?.requiresBirthDate === true;
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.accessToken) return null;
    return { accessToken: data.accessToken, refreshToken: data.refreshToken ?? refreshToken };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isOnboarding = path.startsWith('/onboarding/birth-date');
  const isProtected = path.startsWith('/editor') || path.startsWith('/projects') || path.startsWith('/profile') || path.startsWith('/admin') || path.startsWith('/settings') || isOnboarding;

  let accessToken = request.cookies.get('accessToken')?.value ?? null;
  const refreshToken = request.cookies.get('refreshToken')?.value ?? null;
  let refreshed: { accessToken: string; refreshToken: string } | null = null;

  const isServerAction = request.headers.has('next-action');
  let accessValid = !!accessToken && !isExpiringSoon(accessToken);
  const isAuthPage = path === '/login' || path === '/signup';
  const hadAuthCookies = !!(accessToken || refreshToken);

  if (accessValid && (isProtected || isAuthPage)) {
    try {
      const profile = await fetch(`${API_BASE_URL}/api/profile/me`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (profile.status >= 500) {
        return new NextResponse('Session validation unavailable', { status: 503 });
      }
      const birthDateRequired = profile.status === 403
        && (await profile.json().catch(() => null))?.message === 'Please provide your birth date to continue.';
      accessValid = profile.ok || birthDateRequired;
    } catch {
      return new NextResponse('Session validation unavailable', { status: 503 });
    }
  }

  if ((isProtected || isAuthPage) && !accessValid && refreshToken) {
    refreshed = await refreshAccessToken(refreshToken);
    if (refreshed) accessToken = refreshed.accessToken;
  }

  if (isProtected && !accessValid && !refreshed) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete('accessToken');
    res.cookies.delete('refreshToken');
    res.cookies.delete('username');
    return res;
  }

  const isLoggedIn = accessValid || !!refreshed;
  if (!isLoggedIn) accessToken = null;

  const pendingBirthDate = !!accessToken && needsBirthDate(accessToken);
  let redirectTo: string | null = null;

  if (isProtected && !isServerAction && !isOnboarding && pendingBirthDate) {
    redirectTo = '/onboarding/birth-date';
  }
  const admin = !!accessToken && getRole(accessToken) === 'ADMIN';

  if (isOnboarding && !isServerAction && (accessValid || refreshed) && !pendingBirthDate) {
    redirectTo = admin ? '/explore' : '/projects';
  }

  if (!redirectTo && path.startsWith('/projects') && admin) {
    redirectTo = '/explore';
  }

  if (!redirectTo && path.startsWith('/admin') && !admin) {
    redirectTo = '/projects';
  }

  if (isAuthPage && isLoggedIn) {
    redirectTo = admin ? '/explore' : '/projects';
  }

  const needsAnonId = path.startsWith('/p/') && !request.cookies.get(ANON_ID_COOKIE);
  const anonId = needsAnonId ? crypto.randomUUID() : null;

  if (anonId) request.cookies.set(ANON_ID_COOKIE, anonId);
  if (refreshed) {
    request.cookies.set('accessToken', refreshed.accessToken);
    request.cookies.set('refreshToken', refreshed.refreshToken);
  }

  const response = redirectTo
    ? NextResponse.redirect(new URL(redirectTo, request.url))
    : NextResponse.next({ request });

  if (isAuthPage && hadAuthCookies && !isLoggedIn) {
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    response.cookies.delete('username');
  }

  if (anonId) {
    response.cookies.set(ANON_ID_COOKIE, anonId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  if (refreshed) {
    const secure = process.env.NODE_ENV === 'production';
    response.cookies.set('accessToken', refreshed.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: '/',
    });
    response.cookies.set('refreshToken', refreshed.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_MAX_AGE,
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
    '/settings/:path*',
    '/onboarding/:path*',
    '/login',
    '/signup',
    '/p/:path*',
  ],
};
