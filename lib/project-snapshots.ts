// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { backendFetch } from '@/lib/backend-fetch';

import { authHeaders } from "@/lib/auth";
import type { TitleAlign } from "@/app/editor/types";
import type { PublicItem, PublicTrail } from "@/lib/public-project";
import { authenticatedFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";
import { parseResponse } from "@/lib/http";

export interface ProjectSnapshotSummary {
  id: string;
  version: number;
  createdAt: string;
}

export interface ProjectSnapshotDetail extends ProjectSnapshotSummary {
  title: string;
  description: string | null;
  trails: PublicTrail[];
  looseItems: PublicItem[];
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
  titleAlign: TitleAlign | null;
}

interface SnapshotTrailDTO {
  id: number;
  title: string;
  description: string | null;
  forkedFromId: number | null;
  version: number;
  items: SnapshotItemDTO[];
}

interface ProjectSnapshotDetailDTO extends ProjectSnapshotSummaryDTO {
  content: {
    title: string;
    description: string | null;
    trails: SnapshotTrailDTO[];
    looseItems: SnapshotItemDTO[];
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

function toItem(item: SnapshotItemDTO): PublicItem {
  return { ...item, id: String(item.id), content: item.content ?? "", titleAlign: item.titleAlign ?? "center" };
}

function toDetail(dto: ProjectSnapshotDetailDTO): ProjectSnapshotDetail {
  return {
    ...toSummary(dto),
    title: dto.content.title,
    description: dto.content.description ?? null,
    looseItems: dto.content.looseItems.map(toItem),
    trails: dto.content.trails.map((trail) => ({
      id: String(trail.id),
      title: trail.title,
      description: trail.description ?? "",
      forkedFromId: trail.forkedFromId == null ? null : String(trail.forkedFromId),
      version: trail.version,
      items: trail.items.map(toItem),
    })),
  };
}

export async function getPublicProjectSnapshot(
  projectId: string,
  snapshotId: string,
): Promise<ProjectSnapshotDetail | null> {
  const response = await backendFetch(`${API_BASE_URL}/api/public/project/${projectId}/versions/${snapshotId}`, {
    cache: "no-store",
    headers: await authHeaders(),
  });
  if (!response.ok) return null;
  const dto: ProjectSnapshotDetailDTO = await response.json();
  return toDetail(dto);
}
