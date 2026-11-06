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

function claims(token: string): { exp?: number; project?: string } {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return {}; }
}

export function presenceDocument(token: string): string | null {
  const project = claims(token).project;
  return project ? `project-${project}` : null;
}

export function forgetCollabToken(key: string) {
  tokens.delete(key);
}

export function fetchCollabToken(itemId: string): Promise<string> {
  return fetchToken(itemId, '/api/collab/token', { itemId: Number(itemId) });
}

export function fetchProjectToken(projectId: string): Promise<string> {
  return fetchToken(`project:${projectId}`, '/api/collab/project-token', { projectId });
}

function fetchToken(key: string, path: string, body: object): Promise<string> {
  const cached = tokens.get(key);
  if (cached && cached.expiresAt - Date.now() > 20_000) return Promise.resolve(cached.token);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const request = requestToken(key, path, body).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

async function requestToken(key: string, path: string, body: object): Promise<string> {
  if (Date.now() < cooldownUntil) throw new Error('Live editing is busy. Retrying shortly.');
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || typeof data?.token !== 'string') {
    const error = new Error(data?.message ?? 'Could not open this note for live editing.');
    if ([401, 403, 404].includes(response.status)) error.name = COLLAB_ACCESS_DENIED;
    if (response.status === 429) cooldownUntil = Date.now() + (Number(response.headers.get('Retry-After')) || 10) * 1000;
    throw error;
  }
  tokens.set(key, { token: data.token, expiresAt: (claims(data.token).exp ?? 0) * 1000 });
  return data.token;
}
