// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { COLLAB_URL } from '@/lib/config';

export const COLLAB_ACCESS_DENIED = 'CollabAccessDenied';
const CURSOR_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export function collabUrl(): string {
  return COLLAB_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/collab`;
}

export function cursorColor(userId: string): string {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

const tokens = new Map<string, { token: string; expiresAt: number }>();
const pending = new Map<string, Promise<string>>();
let cooldownUntil = 0;

function expiresAt(token: string): number {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch { return 0; }
}

export function forgetCollabToken(itemId: string) {
  tokens.delete(itemId);
}

export function fetchCollabToken(itemId: string): Promise<string> {
  const cached = tokens.get(itemId);
  if (cached && cached.expiresAt - Date.now() > 20_000) return Promise.resolve(cached.token);
  const inFlight = pending.get(itemId);
  if (inFlight) return inFlight;
  const request = requestCollabToken(itemId).finally(() => pending.delete(itemId));
  pending.set(itemId, request);
  return request;
}

async function requestCollabToken(itemId: string): Promise<string> {
  if (Date.now() < cooldownUntil) throw new Error('Live editing is busy. Retrying shortly.');
  const response = await fetch('/api/collab/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId: Number(itemId) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || typeof data?.token !== 'string') {
    const error = new Error(data?.message ?? 'Could not open this note for live editing.');
    if ([401, 403, 404].includes(response.status)) error.name = COLLAB_ACCESS_DENIED;
    if (response.status === 429) cooldownUntil = Date.now() + (Number(response.headers.get('Retry-After')) || 10) * 1000;
    throw error;
  }
  tokens.set(itemId, { token: data.token, expiresAt: expiresAt(data.token) });
  return data.token;
}
