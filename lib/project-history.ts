"use server";

import { revalidatePath } from 'next/cache';
import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { parseResponse } from '@/lib/http';

export interface HistoryVersion { id: number; createdAt: string; type: 'AUTO' | 'MANUAL' | 'RESTORE'; name: string | null; authorUsername: string }
export interface ProjectHistory { versions: HistoryVersion[]; nextCursor: number | null; unavailable: boolean }
export interface VersionDetail {
  version: HistoryVersion;
  snapshot: {
    title: string;
    description: string | null;
    items: { id: number; title: string; type: string | null; titleAlign: 'left' | 'center' | 'right' | null; content: string | null; unfiled: boolean }[];
    trails: { id: number; title: string; description: string | null; forkedFromId: number | null; itemIds: number[] }[];
  };
}

async function request<T>(projectId: string, path = '', init: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${encodeURIComponent(projectId)}/history${path}`, { ...init, cache: 'no-store' });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? `Request failed with status ${response.status}`);
  }
  return parseResponse<T>(response);
}
export async function getProjectHistory(projectId: string, beforeId?: number): Promise<ProjectHistory> {
  return request(projectId, beforeId == null ? '' : `?beforeId=${beforeId}`);
}
export async function getProjectVersion(projectId: string, versionId: number): Promise<VersionDetail | null> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${encodeURIComponent(projectId)}/history/${versionId}`, { cache: 'no-store' });
  if (response.status === 403 || response.status === 404) return null;
  return parseResponse<VersionDetail>(response);
}
export async function createProjectVersion(projectId: string, name: string, epoch: number): Promise<HistoryVersion> {
  return request(projectId, '', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Project-Epoch': String(epoch) }, body: JSON.stringify({ name: name.trim() || null }) });
}
export async function restoreProjectVersion(projectId: string, versionId: number, epoch: number): Promise<{ restoreEpoch: number }> {
  const result = await request<{ restoreEpoch: number }>(projectId, `/${versionId}/restore`, { method: 'POST', headers: { 'X-Project-Epoch': String(epoch) } });
  revalidatePath(`/editor/${projectId}`);
  return result;
}
