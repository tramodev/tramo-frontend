// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Trail, TrailStep } from './types';

export function resolveItemTrail(trails: Trail[], itemId: string, current?: string, explicit?: string) {
  const contains = (id: string | undefined) => trails.find((trail) => trail.id === id && trail.itemIds.includes(itemId));
  return contains(explicit)?.id ?? contains(current)?.id ?? trails.find((trail) => trail.itemIds.includes(itemId))?.id;
}

export function visibleItemAtLine(positions: { id: string; top: number }[], line: number) {
  let current = positions[0]?.id;
  for (const position of positions) {
    if (position.top > line) break;
    current = position.id;
  }
  return current;
}

export function firstReadableTrail<T extends { id: string; items: unknown[] }>(trails: T[]): T | undefined {
  return [...trails].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })).find(trail => trail.items.length > 0);
}

export function annotationsToReview(previous: TrailStep[], itemIds: string[]): string[] {
  const predecessors = new Map(previous.map((step, index) => [step.itemId, previous[index - 1]?.itemId]));
  const annotated = new Set(previous.filter(step => step.annotation?.trim()).map(step => step.itemId));
  return itemIds.filter((id, index) => annotated.has(id) && predecessors.get(id) !== itemIds[index - 1]);
}
