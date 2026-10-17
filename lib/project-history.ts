"use server";

import { authenticatedFetch } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { parseResponse } from '@/lib/http';

export interface HistoryVersion { id: number; createdAt: string; type: 'AUTO' | 'MANUAL' | 'RESTORE'; name: string | null }
export interface ProjectHistory { versions: HistoryVersion[]; nextCursor: number | null; unavailable: boolean }
export interface VersionDetail {
  version: HistoryVersion;
  snapshot: {
    title: string;
    description: string | null;
    items: { id: number; title: string; titleAlign: 'left' | 'center' | 'right' | null; content: string | null; unfiled: boolean }[];
    trails: { id: number; title: string; description: string | null; itemIds: number[] }[];
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
export async function getProjectVersion(projectId: string, versionId: number): Promise<VersionDetail> {
  return request(projectId, `/${versionId}`);
}
export async function createProjectVersion(projectId: string, name: string, epoch: number): Promise<HistoryVersion> {
  return request(projectId, '', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Project-Epoch': String(epoch) }, body: JSON.stringify({ name: name.trim() || null }) });
}
export async function restoreProjectVersion(projectId: string, versionId: number, epoch: number): Promise<{ restoreEpoch: number }> {
  return request(projectId, `/${versionId}/restore`, { method: 'POST', headers: { 'X-Project-Epoch': String(epoch) } });
}
