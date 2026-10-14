import { API_BASE_URL } from '@/lib/config';
import type { AuthTokens } from '@/lib/auth';

type RefreshEntry = { promise: Promise<AuthTokens | null>; tokens?: AuthTokens };

const state = globalThis as typeof globalThis & {
  tramoRefreshes?: Map<string, RefreshEntry>;
};
const refreshes = state.tramoRefreshes ??= new Map<string, RefreshEntry>();

export function invalidateRefreshTokens(refreshToken: string): void {
  for (const [key, entry] of refreshes) {
    if (key === refreshToken || entry.tokens?.refreshToken === refreshToken) refreshes.delete(key);
  }
}

export function refreshTokens(refreshToken: string, rejectedAccessToken?: string): Promise<AuthTokens | null> {
  if (rejectedAccessToken && refreshes.get(refreshToken)?.tokens?.accessToken === rejectedAccessToken) {
    invalidateRefreshTokens(refreshToken);
  }
  const existing = refreshes.get(refreshToken);
  if (existing) return existing.promise;

  const requestTokens = async (): Promise<AuthTokens | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return null;
      const tokens = await response.json();
      if (typeof tokens?.accessToken !== 'string' || !tokens.accessToken
          || typeof tokens?.refreshToken !== 'string' || !tokens.refreshToken) return null;
      if (refreshes.get(refreshToken) !== entry) return null;
      entry.tokens = tokens;
      return tokens;
    } catch {
      return null;
    }
  };
  const entry: RefreshEntry = { promise: requestTokens() };
  refreshes.set(refreshToken, entry);
  void entry.promise.then((tokens) => {
    if (refreshes.get(refreshToken) !== entry) return;
    if (tokens) {
      setTimeout(() => {
        if (refreshes.get(refreshToken) === entry) refreshes.delete(refreshToken);
      }, 5000).unref();
    } else {
      refreshes.delete(refreshToken);
    }
  });
  return entry.promise;
}
