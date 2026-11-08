// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
function scaledSize(bitmap: ImageBitmap, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  return { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) };
}

export async function readImageSize(file: File, maxDimension: number): Promise<{ width?: number; height?: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = scaledSize(bitmap, file.type === "image/gif" ? Infinity : maxDimension);
    bitmap.close();
    return size;
  } catch {
    return {};
  }
}

export async function resizeImageToBlob(file: File, maxDimension: number, quality: number): Promise<Blob> {
  if (file.type === "image/gif") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const { width, height } = scaledSize(bitmap, maxDimension);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not supported");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
      "image/jpeg",
      quality
    );
  });
}
