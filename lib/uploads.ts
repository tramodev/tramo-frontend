'use server';
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";

export type UploadKind = "avatar" | "thumbnail" | "editor-image";

export interface UploadPresign {
  uploadUrl: string;
  publicUrl: string;
}

export async function getUploadPresign(contentType: string, kind: UploadKind, contentHash: string, contentBytes: number): Promise<UploadPresign> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/uploads/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType, kind, contentHash, contentBytes }),
  });
  if (!response.ok) {
    // limit errors (storage quota, premium-only GIF avatar) carry a user-facing message
    const message = await response.json().then((body) => body?.message).catch(() => null);
    throw new Error(message ?? `Request failed with status ${response.status}`);
  }
  return response.json();
}
