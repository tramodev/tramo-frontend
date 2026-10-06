// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { cookies } from 'next/headers';
import { API_BASE_URL, REFRESH_TOKEN_MAX_AGE } from './config';

export type AuthTokens = { accessToken: string; refreshToken: string; username?: string };

export async function setAuthCookies({ accessToken, refreshToken, username }: AuthTokens): Promise<void> {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === 'production';

  cookieStore.set('accessToken', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 60 * 15,
    path: '/',
  });

  cookieStore.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/',
  });

  if (username) {
    cookieStore.set('username', username, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
  }
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('accessToken')?.value || null;
}

export async function authHeaders(): Promise<HeadersInit | undefined> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function isLoggedIn(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!(cookieStore.get('accessToken') || cookieStore.get('refreshToken'));
}

export async function isAdmin(): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return false;
  const profile: { role: string } = await response.json();
  return profile.role === 'ADMIN';
}

export async function getUsername(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('username')?.value || null;
}

const inflightRefresh = new Map<string, Promise<AuthTokens | null>>();

export async function refreshAccessToken(): Promise<boolean> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;

  if (!refreshToken) {
    return false;
  }

  try {
    cookieStore.set('__rt_probe', '', { maxAge: 0, path: '/' });
  } catch {
    return false;
  }

  let promise = inflightRefresh.get(refreshToken);
  if (!promise) {
    promise = (async (): Promise<AuthTokens | null> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return null;
        return await response.json();
      } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
      }
    })().finally(() => {
      inflightRefresh.delete(refreshToken);
    });
    inflightRefresh.set(refreshToken, promise);
  }

  const tokens = await promise;
  if (!tokens) return false;
  await setAuthCookies(tokens);
  return true;
}

export async function logout() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;
  if (refreshToken) {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
  cookieStore.delete('username');
}