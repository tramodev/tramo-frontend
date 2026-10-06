// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';

import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";
import { parseResponse } from "./http";

export interface ProjectSnapshotSummary {
  id: string;
  version: number;
  createdAt: string;
}

export interface ProjectSnapshotItem {
  id: string;
  title: string;
  type: string | null;
  content: string | null;
}

export interface ProjectSnapshotTrail {
  id: string;
  title: string;
  version: number;
  items: ProjectSnapshotItem[];
}

export interface ProjectSnapshotDetail extends ProjectSnapshotSummary {
  trails: ProjectSnapshotTrail[];
}

interface ProjectSnapshotSummaryDTO {
  id: number;
  version: number;
  createdDate: string;
}

interface SnapshotItemDTO {
  id: number;
  title: string;
  type: string | null;
  content: string | null;
}

interface SnapshotTrailDTO {
  id: number;
  title: string;
  version: number;
  items: SnapshotItemDTO[];
}

interface ProjectSnapshotDetailDTO extends ProjectSnapshotSummaryDTO {
  content: {
    trails: SnapshotTrailDTO[];
  };
}

function toSummary(dto: ProjectSnapshotSummaryDTO): ProjectSnapshotSummary {
  return { id: String(dto.id), version: dto.version, createdAt: dto.createdDate };
}

export async function getProjectSnapshots(projectId: string): Promise<ProjectSnapshotSummary[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${projectId}/versions`);
  const dtos = await parseResponse<ProjectSnapshotSummaryDTO[]>(response);
  return dtos.map(toSummary);
}

function toDetail(dto: ProjectSnapshotDetailDTO): ProjectSnapshotDetail {
  return {
    ...toSummary(dto),
    trails: dto.content.trails.map((trail) => ({
      id: String(trail.id),
      title: trail.title,
      version: trail.version,
      items: trail.items.map((item) => ({
        id: String(item.id),
        title: item.title,
        type: item.type,
        content: item.content,
      })),
    })),
  };
}

export async function getProjectSnapshot(
  projectId: string,
  snapshotId: string,
): Promise<ProjectSnapshotDetail | null> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${projectId}/versions/${snapshotId}`);
  if (response.status === 404) return null;
  const dto = await parseResponse<ProjectSnapshotDetailDTO>(response);
  return toDetail(dto);
}

export async function getPublicProjectSnapshot(
  projectId: string,
  snapshotId: string,
): Promise<ProjectSnapshotDetail | null> {
  const response = await fetch(`${API_BASE_URL}/api/public/project/${projectId}/versions/${snapshotId}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;
  const dto: ProjectSnapshotDetailDTO = await response.json();
  return toDetail(dto);
}
