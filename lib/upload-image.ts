// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { beginEditorImageUpload, completeEditorImageUpload } from "./editor-images";
import { getUploadPresign, type UploadKind } from "./uploads";

async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadImage(blob: Blob, kind: UploadKind, projectId?: string): Promise<string> {
  const contentHash = await sha256Hex(blob);
  const { uploadUrl, publicUrl } = await getUploadPresign(blob.type, kind, contentHash, blob.size, projectId);

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": blob.type },
    body: blob,
  });
  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  return publicUrl;
}

export async function uploadEditorImage(blob: Blob, projectId: string): Promise<string> {
  const contentHash = await sha256Hex(blob);
  const { imageId, uploadUrl } = await beginEditorImageUpload(projectId, blob.type, contentHash, blob.size);
  const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob });
  if (!response.ok) throw new Error('Image upload failed. Please try again.');
  await completeEditorImageUpload(imageId);
  return imageId;
}
