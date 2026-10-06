// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { parseResponse, expectOk } from "./http";

export async function getItemContent(itemId: string): Promise<string> {
  const response = await fetch(`/api/item/${itemId}/content`);
  const data = await parseResponse<{ content?: string }>(response);
  return data.content ?? "";
}

export async function getTrailContents(trailId: string): Promise<Record<string, string>> {
  const response = await fetch(`/api/trail/${trailId}/content`);
  const rows = await parseResponse<{ id: number; content: string }[]>(response);
  return Object.fromEntries(rows.map((row) => [String(row.id), row.content]));
}

export async function saveItemContent(itemId: string, content: string): Promise<void> {
  const response = await fetch(`/api/item/${itemId}/content`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  await expectOk(response);
}
