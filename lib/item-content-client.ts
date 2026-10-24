// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { parseResponse, expectOk } from "./http";

const extractionEpochs = new Map<string, number>();
const savedContents = new Map<string, string>();
const contentSessions = new Map<string, number>();
export const getSavedItemContent = (id: string) => savedContents.get(id) ?? '';
export const getExtractionEpoch = (id: string) => extractionEpochs.get(id) ?? 0;
export const acceptExtractionEpoch = (id: string, epoch: number, content: string) => { extractionEpochs.set(id, epoch); savedContents.set(id, content); };

export function resetItemContents(itemIds: string[]): void {
  for (const id of itemIds) {
    contentSessions.set(id, (contentSessions.get(id) ?? 0) + 1);
    extractionEpochs.delete(id);
    savedContents.delete(id);
  }
}

export function acceptLoadedContents(rows: { id: number; content: string; extractionEpoch?: number }[]): Record<string, string> {
  for (const row of rows) if (!extractionEpochs.has(String(row.id))) acceptExtractionEpoch(String(row.id), row.extractionEpoch ?? 0, row.content ?? '');
  return Object.fromEntries(rows.map((row) => [String(row.id), row.content ?? '']));
}

export async function getItemContentSnapshot(itemId: string): Promise<{ content: string; extractionEpoch: number }> {
  const response = await fetch(`/api/item/${itemId}/content`);
  const data = await parseResponse<{ content?: unknown; extractionEpoch?: unknown }>(response);
  const content = data.content ?? '';
  const extractionEpoch = data.extractionEpoch ?? 0;
  if (typeof content !== 'string' || typeof extractionEpoch !== 'number' || !Number.isSafeInteger(extractionEpoch) || extractionEpoch < 0) {
    throw new Error('Invalid note content response.');
  }
  return { content, extractionEpoch };
}

export async function getItemContent(itemId: string): Promise<string> {
  const session = contentSessions.get(itemId);
  const data = await getItemContentSnapshot(itemId);
  if (session === contentSessions.get(itemId) && !extractionEpochs.has(itemId)) acceptExtractionEpoch(itemId, data.extractionEpoch ?? 0, data.content ?? '');
  return data.content ?? "";
}

export async function getTrailContents(trailId: string): Promise<Record<string, string>> {
  const sessions = new Map(contentSessions);
  const response = await fetch(`/api/trail/${trailId}/content`);
  const rows = await parseResponse<{ id: number; content: string; extractionEpoch?: number }[]>(response);
  return acceptLoadedContents(rows.filter(row => sessions.get(String(row.id)) === contentSessions.get(String(row.id))));
}

export async function saveItemContent(itemId: string, content: string, restoreEpoch = 0, projectId?: string): Promise<void> {
  const session = contentSessions.get(itemId);
  const response = await fetch(`/api/item/${itemId}/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Project-Epoch": String(restoreEpoch), ...(projectId ? { "X-Project-Id": projectId } : {}) },
    body: JSON.stringify({ content, extractionEpoch: getExtractionEpoch(itemId), expectedContent: savedContents.get(itemId) ?? '' }),
  });
  if (response.status === 409) {
    const data = await response.json().catch(() => null);
    const error = new Error(data?.message ?? 'This note changed in another session. Reload before saving.');
    error.name = data?.code === 'PROJECT_VERSION_CONFLICT' ? 'ProjectVersionConflict' : 'ContentConflict';
    throw error;
  }
  if (response.status === 413 || response.status === 429) {
    const error = await response.json().catch(() => null);
    throw new Error(typeof error?.message === 'string' ? error.message : `Request failed with status ${response.status}`);
  }
  await expectOk(response);
  if (session === contentSessions.get(itemId)) savedContents.set(itemId, content);
}
