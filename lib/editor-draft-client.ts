import type { DraftCommitResult, DraftEntities } from '@/lib/editor-draft';

export class DraftRequestError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfter = 0, readonly code?: string) { super(message); }
  get retryable() { return this.code !== 'STORAGE_QUOTA_EXCEEDED' && (this.status === 408 || this.status === 429 || this.status >= 500); }
}

export async function commitEditorDraft(clientRequestId: string, entities: DraftEntities): Promise<DraftCommitResult> {
  if (new TextEncoder().encode(entities.item.content).length > 1024 * 1024) throw new DraftRequestError('Notes must not exceed 1 MiB. Your draft is kept locally; shorten it to save.', 413);
  let response: Response;
  try { response = await fetch('/api/projects/draft-commit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ clientRequestId, project: { title: entities.project.title.trim() },
      trail: { title: entities.trail.title.trim() }, item: { ...entities.item, title: entities.item.title.trim() } }),
  }); } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new DraftRequestError('The request timed out. Your draft is kept locally and will be retried.', 408);
    }
    throw error;
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const retry = response.headers.get('Retry-After');
    const retryAfter = retry ? Math.max(0, /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now()) : 0;
    throw new DraftRequestError(body?.message ?? `Could not save your draft (${response.status}).`, response.status, retryAfter, body?.code);
  }
  return response.json();
}
