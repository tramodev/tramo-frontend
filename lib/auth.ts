'use server';
import { cookies } from 'next/headers';
import { API_BASE_URL } from './config';

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

// ponytail: in-flight refresh dedup keyed by refresh token. Collapses the burst
// of parallel 401s from getProject (which fires ~10 fetches at once) into one
// refresh call, so backend refresh-token rotation doesn't invalidate the rest.
// Edge left uncovered: two tabs of the same user racing may do one extra
// refresh — no session loss, upgrade to a shared store only if it matters.
const inflightRefresh = new Map<string, Promise<boolean>>();

export async function refreshAccessToken(): Promise<boolean> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;

  if (!refreshToken) {
    return false;
  }

  const existing = inflightRefresh.get(refreshToken);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      cookieStore.set('accessToken', data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 15,
        path: '/',
      });

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  })().finally(() => {
    inflightRefresh.delete(refreshToken);
  });

  inflightRefresh.set(refreshToken, promise);
  return promise;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');
  cookieStore.delete('username');
}