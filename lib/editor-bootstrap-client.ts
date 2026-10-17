import { parseResponse } from '@/lib/http';
import type { Project, ProjectVisibility } from '@/lib/projects-store';
import type { Item, Trail, TitleAlign } from '@/app/editor/types';

interface EditorBootstrapDTO {
  id: string;
  restoreEpoch: number;
  historyUnavailable: boolean;
  title: string;
  description: string | null;
  graphColors: string | null;
  visibility: ProjectVisibility;
  tags: string[];
  trails: { id: number; title: string; description: string | null; version: number; forkedFromId: number | null; itemIds: number[] }[];
  items: { id: number; title: string; titleAlign: string | null; unfiled: boolean; words: number; characters: number }[];
  selectedItemId: number | null;
  selectedTrailId: number | null;
  contents: { id: number; content: string; extractionEpoch: number }[];
  username: string;
  imageUrl: string | null;
}

export async function getEditorBootstrap(id: string, noteId?: string | null, trailId?: string | null) {
  const params = new URLSearchParams();
  if (noteId && /^\d+$/.test(noteId)) params.set('noteId', noteId);
  if (trailId && /^\d+$/.test(trailId)) params.set('trailId', trailId);
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}/editor${params.size ? `?${params}` : ''}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  const dto = await parseResponse<EditorBootstrapDTO>(response);
  const items: Record<string, Item> = Object.fromEntries(dto.items.map((item) => [String(item.id), {
    id: String(item.id), title: item.title, titleAlign: (item.titleAlign as TitleAlign) ?? 'center',
    unfiled: item.unfiled, content: null, textStats: { words: item.words, characters: item.characters },
  }]));
  const trails: Trail[] = dto.trails.map((trail) => ({
    id: String(trail.id), title: trail.title, description: trail.description ?? '',
    version: trail.version, forkedFrom: trail.forkedFromId == null ? null : String(trail.forkedFromId),
    itemIds: trail.itemIds.map(String), steps: trail.itemIds.map((itemId) => ({ itemId: String(itemId) })),
  }));
  return {
    restoreEpoch: dto.restoreEpoch,
    historyUnavailable: dto.historyUnavailable,
    project: { id: dto.id, restoreEpoch: dto.restoreEpoch, title: dto.title, description: dto.description ?? '', graphColors: dto.graphColors,
      visibility: dto.visibility, tags: dto.tags.join(', '), trails, items } as Project,
    selectedItemId: dto.selectedItemId == null ? undefined : String(dto.selectedItemId),
    selectedTrailId: dto.selectedTrailId == null ? undefined : String(dto.selectedTrailId),
    contents: dto.contents,
    profile: { username: dto.username, imageUrl: dto.imageUrl },
  };
}
