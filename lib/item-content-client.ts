// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { parseResponse, expectOk } from "./http";

const extractionEpochs = new Map<string, number>();
const savedContents = new Map<string, string>();
export const getExtractionEpoch = (id: string) => extractionEpochs.get(id) ?? 0;
export const acceptExtractionEpoch = (id: string, epoch: number, content: string) => { extractionEpochs.set(id, epoch); savedContents.set(id, content); };

export function acceptLoadedContents(rows: { id: number; content: string; extractionEpoch?: number }[]): Record<string, string> {
  for (const row of rows) if (!extractionEpochs.has(String(row.id))) acceptExtractionEpoch(String(row.id), row.extractionEpoch ?? 0, row.content ?? '');
  return Object.fromEntries(rows.map((row) => [String(row.id), row.content ?? '']));
}

export async function getItemContent(itemId: string): Promise<string> {
  const response = await fetch(`/api/item/${itemId}/content`);
  const data = await parseResponse<{ content?: string; extractionEpoch?: number }>(response);
  if (!extractionEpochs.has(itemId)) acceptExtractionEpoch(itemId, data.extractionEpoch ?? 0, data.content ?? '');
  return data.content ?? "";
}

export async function getTrailContents(trailId: string): Promise<Record<string, string>> {
  const response = await fetch(`/api/trail/${trailId}/content`);
  const rows = await parseResponse<{ id: number; content: string; extractionEpoch?: number }[]>(response);
  return acceptLoadedContents(rows);
}

export async function saveItemContent(itemId: string, content: string): Promise<void> {
  const response = await fetch(`/api/item/${itemId}/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, extractionEpoch: getExtractionEpoch(itemId), expectedContent: savedContents.get(itemId) ?? '' }),
  });
  await expectOk(response);
  savedContents.set(itemId, content);
}
