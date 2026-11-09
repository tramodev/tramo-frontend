// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Item, TitleAlign, Trail } from '@/app/editor/types';

export type ItemMeta = Omit<Item, 'content'>;
export type Structure = { version: number; restoreEpoch: number; items: Record<string, ItemMeta>; trails: Trail[] };
export type StructureOp = (structure: Structure) => Structure;
export type PendingOp = { key: string; apply: StructureOp; done?: boolean };
export type StructureDTO = {
  version: number;
  restoreEpoch: number;
  trails: { id: number | string; title: string; description?: string | null; version: number; forkedFromId?: number | string | null; itemIds: (number | string)[] }[];
  items: { id: number | string; title: string; titleAlign?: string | null; unfiled: boolean; words: number; characters: number }[];
};

export const EMPTY_STRUCTURE: Structure = { version: -1, restoreEpoch: 0, items: {}, trails: [] };
const ALIGNS = new Set(['left', 'center', 'right']);

export function toStructure(dto: StructureDTO): Structure {
  return {
    version: dto.version,
    restoreEpoch: dto.restoreEpoch,
    items: Object.fromEntries(dto.items.map(item => [String(item.id), {
      id: String(item.id), title: item.title, titleAlign: (item.titleAlign as TitleAlign) ?? 'center',
      unfiled: item.unfiled, textStats: { words: item.words, characters: item.characters },
    }])),
    trails: dto.trails.map(trail => ({
      id: String(trail.id), title: trail.title, description: trail.description ?? '',
      version: trail.version, forkedFrom: trail.forkedFromId == null ? null : String(trail.forkedFromId),
      itemIds: trail.itemIds.map(String), steps: trail.itemIds.map(itemId => ({ itemId: String(itemId) })),
    })),
  };
}

const id = (value: unknown) => (typeof value === 'number' && Number.isSafeInteger(value)) || (typeof value === 'string' && /^\d{1,19}$/.test(value));
const count = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function parseStructure(raw: unknown): Structure | null {
  if (typeof raw !== 'string') return null;
  let data: Record<string, unknown>;
  try { data = JSON.parse(raw); } catch { return null; }
  if (!data || typeof data !== 'object' || !count(data.version) || !count(data.restoreEpoch) || !Array.isArray(data.items) || !Array.isArray(data.trails)) return null;
  const items = (data.items as Record<string, unknown>[]).filter(item => item && id(item.id) && typeof item.title === 'string' && item.title.length <= 255
    && typeof item.unfiled === 'boolean' && count(item.words) && count(item.characters) && (item.titleAlign == null || ALIGNS.has(item.titleAlign as string)));
  const trails = (data.trails as Record<string, unknown>[]).filter(trail => trail && id(trail.id) && typeof trail.title === 'string' && count(trail.version)
    && (trail.description == null || typeof trail.description === 'string') && (trail.forkedFromId == null || id(trail.forkedFromId))
    && Array.isArray(trail.itemIds) && trail.itemIds.every(id));
  return toStructure({ ...data, items, trails } as StructureDTO);
}

const withTrails = (structure: Structure, trails: Trail[]) => trails.every((trail, index) => trail === structure.trails[index]) && trails.length === structure.trails.length
  ? structure : { ...structure, trails };
const withItem = (structure: Structure, itemId: string, patch: Partial<ItemMeta>) => {
  const item = structure.items[itemId];
  if (!item || Object.entries(patch).every(([key, value]) => item[key as keyof ItemMeta] === value)) return structure;
  return { ...structure, items: { ...structure.items, [itemId]: { ...item, ...patch } } };
};
const ordered = (trail: Trail, itemIds: string[]): Trail => trail.itemIds.length === itemIds.length && trail.itemIds.every((itemId, index) => itemId === itemIds[index])
  ? trail : { ...trail, itemIds, steps: itemIds.map(itemId => trail.steps.find(step => step.itemId === itemId) ?? { itemId }) };
const orphaned = (structure: Structure, itemIds: string[]) => itemIds.reduce((next, itemId) =>
  next.trails.some(trail => trail.itemIds.includes(itemId)) ? next : withItem(next, itemId, { unfiled: true }), structure);

export const compose = (...ops: StructureOp[]): StructureOp => structure => ops.reduce((next, op) => op(next), structure);

export const renameItem = (itemId: string, title: string): StructureOp => structure => withItem(structure, itemId, { title });

export const alignItem = (itemId: string, titleAlign: TitleAlign): StructureOp => structure => withItem(structure, itemId, { titleAlign });

export const renameTrail = (trailId: string, title: string): StructureOp => structure =>
  withTrails(structure, structure.trails.map(trail => trail.id === trailId && trail.title !== title ? { ...trail, title } : trail));

export const orderTrailItems = (trailId: string, itemIds: string[]): StructureOp => structure =>
  withTrails(structure, structure.trails.map(trail => {
    if (trail.id !== trailId) return trail;
    const known = itemIds.filter(itemId => trail.itemIds.includes(itemId));
    return ordered(trail, [...known, ...trail.itemIds.filter(itemId => !known.includes(itemId))]);
  }));

export const orderTrails = (trailIds: string[]): StructureOp => structure => {
  const rank = new Map(trailIds.map((trailId, index) => [trailId, index]));
  return withTrails(structure, [...structure.trails].sort((a, b) => (rank.get(a.id) ?? rank.size) - (rank.get(b.id) ?? rank.size)));
};

export const addTrail = (trail: Trail): StructureOp => structure =>
  structure.trails.some(existing => existing.id === trail.id) ? structure : { ...structure, trails: [...structure.trails, trail] };

export const removeTrail = (trailId: string): StructureOp => structure => {
  const target = structure.trails.find(trail => trail.id === trailId);
  if (!target) return structure;
  return orphaned({ ...structure, trails: structure.trails.filter(trail => trail !== target) }, target.itemIds);
};

export const linkItem = (trailId: string, itemId: string): StructureOp => structure =>
  !structure.items[itemId] ? structure : withTrails(structure, structure.trails.map(trail =>
    trail.id === trailId && !trail.itemIds.includes(itemId) ? ordered(trail, [...trail.itemIds, itemId]) : trail));

export const unlinkItem = (trailId: string, itemId: string): StructureOp => structure =>
  orphaned(withTrails(structure, structure.trails.map(trail =>
    trail.id === trailId && trail.itemIds.includes(itemId) ? ordered(trail, trail.itemIds.filter(other => other !== itemId)) : trail)), [itemId]);

export const addItem = (item: ItemMeta, trailId?: string): StructureOp => structure => {
  const next = structure.items[item.id] ? structure : { ...structure, items: { ...structure.items, [item.id]: item } };
  return trailId ? linkItem(trailId, item.id)(next) : next;
};

export const removeItem = (itemId: string): StructureOp => structure => {
  if (!structure.items[itemId] && !structure.trails.some(trail => trail.itemIds.includes(itemId))) return structure;
  const items = { ...structure.items };
  delete items[itemId];
  return { ...withTrails(structure, structure.trails.map(trail => trail.itemIds.includes(itemId) ? ordered(trail, trail.itemIds.filter(other => other !== itemId)) : trail)), items };
};

export const view = (remote: Structure, ops: PendingOp[]) => ops.reduce((structure, op) => op.apply(structure), remote);

export const absorbed = (op: PendingOp, remote: Structure) => op.apply(remote) === remote;

export function followNavigation<T extends { itemId?: string; trailId?: string; request?: unknown }>(previous: T, structure: Structure): T {
  const trail = previous.trailId ? structure.trails.find(candidate => candidate.id === previous.trailId) : undefined;
  const trailGone = !!previous.trailId && !trail;
  const itemGone = !!previous.itemId && !structure.items[previous.itemId];
  if (!trailGone && !itemGone) return previous;
  if (!itemGone) return { ...previous, trailId: undefined };
  const fallback = trail?.itemIds.find(itemId => structure.items[itemId]) ?? structure.trails.flatMap(other => other.itemIds).find(itemId => structure.items[itemId]);
  const fallbackTrail = fallback && trail?.itemIds.includes(fallback) ? trail : structure.trails.find(other => fallback && other.itemIds.includes(fallback));
  return { ...previous, trailId: fallbackTrail?.id, itemId: fallback, request: undefined };
}
