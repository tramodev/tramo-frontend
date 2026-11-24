// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { searchableText } from '@/app/editor/editor-utils';

export const PLAYGROUND_STORAGE_KEY = 'tramo:playground';
const IMPORT_ID_KEY = 'tramo:playground-import';

type StoredPlayground = {
  title: string;
  structure: { items: { id: string; title: string; titleAlign: string }[]; trails: { title: string; itemIds: string[] }[] };
  contents: Record<string, string>;
};

function parse(raw: string | null): StoredPlayground | null {
  try {
    const data = JSON.parse(raw ?? 'null');
    return Array.isArray(data?.structure?.items) && Array.isArray(data?.structure?.trails) && data.contents ? data : null;
  } catch {
    return null;
  }
}

export function hasPlaygroundContent(raw: string | null): boolean {
  const data = parse(raw);
  return !!data && Object.values(data.contents).some(content => typeof content === 'string' && searchableText(content).trim() !== '');
}

export function playgroundEditorHref(result: { projectId: string; trailId: number | null; itemId: number | null }) {
  return `/editor/${result.projectId}?note=${result.itemId ?? ''}&trail=${result.trailId ?? ''}&write=1`;
}

export async function importPlayground(raw: string): Promise<{ projectId: string; trailId: number | null; itemId: number | null }> {
  const data = parse(raw);
  if (!data?.structure.items.length) throw new Error('There is nothing in the playground to save.');
  let clientRequestId = crypto.randomUUID();
  try {
    clientRequestId = localStorage.getItem(IMPORT_ID_KEY) ?? clientRequestId;
    localStorage.setItem(IMPORT_ID_KEY, clientRequestId);
  } catch {}
  const response = await fetch('/api/projects/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientRequestId,
      title: data.title,
      trails: data.structure.trails.map(trail => ({ title: trail.title, itemIds: trail.itemIds })),
      items: data.structure.items.map(item => ({ id: item.id, title: item.title, titleAlign: item.titleAlign, content: data.contents[item.id] ?? '' })),
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Could not save the playground (${response.status}). Your notes are still in this browser.`);
  }
  const result = await response.json();
  try {
    localStorage.removeItem(PLAYGROUND_STORAGE_KEY);
    localStorage.removeItem(IMPORT_ID_KEY);
  } catch {}
  return result;
}
