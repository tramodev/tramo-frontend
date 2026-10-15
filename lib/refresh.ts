import { API_BASE_URL } from '@/lib/config';
import type { AuthTokens } from '@/lib/auth';

type RefreshResult = AuthTokens | null | 'unavailable';
type RefreshEntry = { promise: Promise<RefreshResult>; tokens?: AuthTokens };

const state = globalThis as typeof globalThis & {
  tramoRefreshes?: Map<string, RefreshEntry>;
};
const refreshes = state.tramoRefreshes ??= new Map<string, RefreshEntry>();

export function invalidateRefreshTokens(refreshToken: string): void {
  for (const [key, entry] of refreshes) {
    if (key === refreshToken || entry.tokens?.refreshToken === refreshToken) refreshes.delete(key);
  }
}

export function refreshTokens(refreshToken: string, rejectedAccessToken?: string): Promise<RefreshResult> {
  if (rejectedAccessToken && refreshes.get(refreshToken)?.tokens?.accessToken === rejectedAccessToken) {
    invalidateRefreshTokens(refreshToken);
  }
  const existing = refreshes.get(refreshToken);
  if (existing) return existing.promise;

  const requestTokens = async (): Promise<RefreshResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) return 'unavailable';
      const tokens = await response.json();
      if (typeof tokens?.accessToken !== 'string' || !tokens.accessToken
          || typeof tokens?.refreshToken !== 'string' || !tokens.refreshToken) return 'unavailable';
      if (refreshes.get(refreshToken) !== entry) return null;
      entry.tokens = tokens;
      return tokens;
    } catch {
      return 'unavailable';
    }
  };
  const entry: RefreshEntry = { promise: requestTokens() };
  refreshes.set(refreshToken, entry);
  void entry.promise.then((tokens) => {
    if (refreshes.get(refreshToken) !== entry) return;
    if (tokens && tokens !== 'unavailable') {
      setTimeout(() => {
        if (refreshes.get(refreshToken) === entry) refreshes.delete(refreshToken);
      }, 5000).unref();
    } else {
      refreshes.delete(refreshToken);
    }
  });
  return entry.promise;
}
