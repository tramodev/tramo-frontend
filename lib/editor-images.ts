'use server';

import { authenticatedFetch } from './api';
import { API_BASE_URL } from './config';

export async function beginEditorImageUpload(projectId: string, contentType: string, contentHash: string, contentBytes: number): Promise<{ imageId: string; uploadUrl: string }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/uploads/editor-images/presign`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, contentType, contentHash, contentBytes }), cache: 'no-store',
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'Image upload is unavailable.');
  return response.json();
}

export async function completeEditorImageUpload(imageId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/uploads/editor-images/${encodeURIComponent(imageId)}/complete`, {
    method: 'POST', cache: 'no-store',
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'Could not confirm image upload.');
}
