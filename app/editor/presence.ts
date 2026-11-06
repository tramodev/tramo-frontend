// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { publicImageOrigins } from '@/lib/csp';

export type PresenceRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type PresenceStatus = 'writing' | 'viewing' | 'idle';
export type PresenceState = {
  user: { id: string; name: string; imageUrl: string | null };
  role: PresenceRole;
  itemId: string | null;
  trailId: string | null;
  typingAt: number | null;
  activeAt: number;
  hidden: boolean;
};
export type Peer = PresenceState & { status: PresenceStatus; idleMs: number; self: boolean };

export const TYPING_MS = 10_000;
export const IDLE_MS = 5 * 60_000;
const RANK: Record<PresenceStatus, number> = { writing: 2, viewing: 1, idle: 0 };
const ROLES = new Set(['OWNER', 'EDITOR', 'VIEWER']);
const id = (value: unknown) => typeof value === 'string' && /^\d{1,19}$/.test(value) ? value : null;
const time = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;

function imageUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && publicImageOrigins.includes(url.origin) ? value : null;
  } catch {
    return null;
  }
}

export function parsePresence(raw: unknown): PresenceState | null {
  if (!raw || typeof raw !== 'object') return null;
  const state = raw as Record<string, unknown>;
  const user = state.user as Record<string, unknown> | undefined;
  const userId = id(user?.id);
  const activeAt = time(state.activeAt);
  if (!userId || activeAt === null || typeof user?.name !== 'string' || !ROLES.has(state.role as string)) return null;
  return {
    user: { id: userId, name: user.name.slice(0, 64) || 'Someone', imageUrl: imageUrl(user.imageUrl) },
    role: state.role as PresenceRole,
    itemId: id(state.itemId),
    trailId: id(state.trailId),
    typingAt: state.role === 'VIEWER' ? null : time(state.typingAt),
    activeAt,
    hidden: state.hidden === true,
  };
}

export function presenceStatus(state: PresenceState, now: number): PresenceStatus {
  if (state.hidden || now - state.activeAt > IDLE_MS) return 'idle';
  if (state.role !== 'VIEWER' && state.typingAt !== null && now - state.typingAt <= TYPING_MS) return 'writing';
  return 'viewing';
}

export function presencePeers(states: Iterable<unknown>, selfId: string, now: number): Peer[] {
  const byUser = new Map<string, Peer>();
  for (const raw of states) {
    const state = parsePresence(raw);
    if (!state) continue;
    const peer = { ...state, status: presenceStatus(state, now), idleMs: Math.max(0, now - state.activeAt), self: state.user.id === selfId };
    const current = byUser.get(peer.user.id);
    if (!current || RANK[peer.status] > RANK[current.status] || (RANK[peer.status] === RANK[current.status] && peer.activeAt > current.activeAt)) {
      byUser.set(peer.user.id, peer);
    }
  }
  return [...byUser.values()].sort((a, b) =>
    Number(b.self) - Number(a.self) || a.user.name.localeCompare(b.user.name) || a.user.id.localeCompare(b.user.id));
}
