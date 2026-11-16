// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Trail } from './types';

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

export function activeVisibleItem(positions: { id: string; top: number; bottom: number }[], view: { top: number; bottom: number; line: number; atEnd: boolean }, focusedId?: string) {
  const visible = positions.filter(position => position.bottom > view.top && position.top < view.bottom);
  if (focusedId && visible.some(position => position.id === focusedId)) return focusedId;
  if (view.atEnd && visible.length) return visible[visible.length - 1].id;
  return visibleItemAtLine(positions, view.line);
}
