// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { COLLAB_URL } from '@/lib/config';

const CURSOR_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export function collabUrl(): string {
  return COLLAB_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/collab`;
}

export function cursorColor(userId: string): string {
  let hash = 0;
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export async function fetchCollabToken(itemId: string): Promise<string> {
  const response = await fetch('/api/collab/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId: Number(itemId) }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || typeof data?.token !== 'string') throw new Error(data?.message ?? 'Could not open this note for live editing.');
  return data.token;
}
