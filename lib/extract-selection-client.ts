import type { Item, TrailStep } from '@/app/editor/types';

export interface ExtractionRequest {
  operationId: string;
  title: string;
  expectedContent: string;
  extractionEpoch: number;
  sourceContent: string;
  extractedContent: string;
  trailId: number | null;
  appendToTrail: boolean;
  expectedOrder: number[] | null;
}
export interface ExtractionResult {
  item: Item;
  sourceContent: string;
  extractionEpoch: number;
  trailId?: string;
  steps: TrailStep[];
}
export async function getExtractionTrailCount(projectId: string, sourceId: string): Promise<number> {
  const response = await fetch(`/api/projects/${projectId}/items/${sourceId}/extract`);
  if (!response.ok) throw new Error('Could not check where this note is used. Close this dialog and try again.');
  return (await response.json()).trailCount;
}
export async function extractSelection(projectId: string, sourceId: string, request: ExtractionRequest): Promise<ExtractionResult> {
  const response = await fetch(`/api/projects/${projectId}/items/${sourceId}/extract`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.message ?? 'Could not extract this selection. Your local content is unchanged. Retry the same request.');
  return { item: { id: String(data.item.id), title: data.item.title, titleAlign: data.item.titleAlign ?? 'center', unfiled: data.item.unfiled, content: data.content, associations: [], linkedItemIds: [] },
    sourceContent: data.sourceContent, extractionEpoch: data.extractionEpoch, trailId: data.trailId == null ? undefined : String(data.trailId),
    steps: data.steps.map((step: { id: number }) => ({ itemId: String(step.id) })) };
}
