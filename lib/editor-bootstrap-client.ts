import { parseResponse } from '@/lib/http';
import type { Project, ProjectRole, ProjectVisibility } from '@/lib/projects-store';
import type { Item } from '@/app/editor/types';
import { toStructure } from '@/app/editor/structure';

interface EditorBootstrapDTO {
  id: string;
  restoreEpoch: number;
  structureVersion: number;
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
  role: ProjectRole | null;
}

export async function getEditorBootstrap(id: string, noteId?: string | null, trailId?: string | null) {
  const params = new URLSearchParams();
  if (noteId && /^\d+$/.test(noteId)) params.set('noteId', noteId);
  if (trailId && /^\d+$/.test(trailId)) params.set('trailId', trailId);
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}/editor${params.size ? `?${params}` : ''}`, { cache: 'no-store' });
  if (response.status === 404) return null;
  const dto = await parseResponse<EditorBootstrapDTO>(response);
  const structure = toStructure({ version: dto.structureVersion, restoreEpoch: dto.restoreEpoch, trails: dto.trails, items: dto.items });
  const items: Record<string, Item> = Object.fromEntries(Object.entries(structure.items).map(([id, item]) => [id, { ...item, content: null }]));
  const trails = structure.trails;
  return {
    structure,
    restoreEpoch: dto.restoreEpoch,
    historyUnavailable: dto.historyUnavailable,
    project: { id: dto.id, restoreEpoch: dto.restoreEpoch, title: dto.title, description: dto.description ?? '', graphColors: dto.graphColors,
      visibility: dto.visibility, tags: dto.tags.join(', '), trails, items } as Project,
    selectedItemId: dto.selectedItemId == null ? undefined : String(dto.selectedItemId),
    selectedTrailId: dto.selectedTrailId == null ? undefined : String(dto.selectedTrailId),
    contents: dto.contents,
    profile: { username: dto.username, imageUrl: dto.imageUrl },
    role: dto.role ?? 'OWNER',
  };
}
