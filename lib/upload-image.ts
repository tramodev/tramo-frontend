import { getUploadPresign, type UploadKind } from "./uploads";

async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadImage(blob: Blob, kind: UploadKind): Promise<string> {
  const contentHash = await sha256Hex(blob);
  const { uploadUrl, publicUrl } = await getUploadPresign(blob.type, kind, contentHash, blob.size);

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
