// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
export const ITEM_LINK_REL_PREFIX = 'tramo-idea:';
const LEGACY_ITEM_LINK_REL_PREFIX = 'mypath-idea:';

export function itemLinkRel(itemId: string): string {
  return `${ITEM_LINK_REL_PREFIX}${itemId}`;
}

export function itemIdFromRel(rel: string): string | null {
  if (rel.startsWith(ITEM_LINK_REL_PREFIX)) return rel.slice(ITEM_LINK_REL_PREFIX.length);
  if (rel.startsWith(LEGACY_ITEM_LINK_REL_PREFIX)) return rel.slice(LEGACY_ITEM_LINK_REL_PREFIX.length);
  return null;
}
