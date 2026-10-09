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

export function itemIdsFromContent(content: string | null): string[] {
  if (!content) return [];
  try {
    const found = new Set<string>();
    const visit = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      const node = value as { type?: unknown; rel?: unknown; children?: unknown };
      if (node.type === 'link' && typeof node.rel === 'string') {
        const id = itemIdFromRel(node.rel);
        if (id) found.add(id);
      }
      if (Array.isArray(node.children)) node.children.forEach(visit);
    };
    visit((JSON.parse(content) as { root?: unknown }).root);
    return [...found];
  } catch { return []; }
}
