// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';

import { Item, Trail, TitleAlign } from "@/app/editor/types";
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";
import { parseResponse, expectOk } from "./http";
import { anonIdHeader } from "./public-project";
import { assertProjectText, PROJECT_TEXT_MAX_LENGTH } from "@/lib/project-validation";

export type ProjectVisibility = "private" | "unlisted" | "published";
export type MapPreviews = Record<string, { text: string; linkedItemIds: string[] }>;

export interface Project {
  id: string;
  title: string;
  restoreEpoch: number;
  description: string;
  graphColors: string | null;
  trails: Trail[];
  items: Record<string, Item>;
  visibility: ProjectVisibility;
  thumbnailImageUrl: string | null;
  tags: string;
  createdAt: string;
  updatedAt: string;
  storageBytes: number;
  forkedFromProjectId: string | null;
  forkedFromTitle: string | null;
  forkedFromOwnerUsername: string | null;
}


interface ProjectDTO {
  id: number;
  title: string;
  restoreEpoch: number;
  description: string | null;
  graphColors: string | null;
  visibility: ProjectVisibility | null;
  thumbnailImageUrl: string | null;
  tags: string[] | null;
  creationDate: string;
  modifiedDate: string;
  storageBytes: number;
  forkedFromProjectId: string | null;
  forkedFromTitle: string | null;
  forkedFromOwnerUsername: string | null;
}

interface TrailDTO {
  id: number;
  title: string;
  description: string | null;
  visibility: string | null;
  creationDate: string;
  modifiedDate: string;
  projectId: number;
  version: number;
  forkedFromId: number | null;
}

interface ItemDTO {
  id: number;
  title: string;
  type: string | null;
  titleAlign: string | null;
  createdDate: string;
  modifiedDate: string;
  unfiled?: boolean;
}

type TrailStepDTO = ItemDTO;


const jsonHeaders = { "Content-Type": "application/json" };

type ApiInit = Omit<RequestInit, "body"> & { json?: unknown; epoch?: number; projectId?: string };

function api(path: string, init: ApiInit = {}): Promise<Response> {
  const { json, epoch, projectId, headers: extraHeaders, ...rest } = init;
  return authenticatedFetch(`${API_BASE_URL}${path}`, {
    ...rest,
    ...(json !== undefined && { body: JSON.stringify(json) }),
    headers: { ...(json !== undefined ? jsonHeaders : undefined), ...(epoch !== undefined ? { "X-Project-Epoch": String(epoch) } : {}), ...(projectId ? { "X-Project-Id": projectId } : {}), ...extraHeaders },
  });
}

async function apiJson<T>(path: string, init?: ApiInit): Promise<T> {
  return parseResponse<T>(await api(path, init));
}

async function apiVoid(path: string, init?: ApiInit): Promise<void> {
  await expectOk(await api(path, init));
}

async function apiResult(path: string, init?: ApiInit): Promise<{ error: string | null }> {
  const response = await api(path, init);
  if (response.ok) return { error: null };
  const message = await response.json().then((body) => body?.message).catch(() => null);
  return { error: message ?? `Request failed with status ${response.status}` };
}

function toProjectSummary(dto: ProjectDTO): Project {
  return {
    id: String(dto.id),
    title: dto.title,
    restoreEpoch: dto.restoreEpoch ?? 0,
    description: dto.description ?? "",
    graphColors: dto.graphColors ?? null,
    trails: [],
    items: {},
    visibility: dto.visibility ?? "private",
    thumbnailImageUrl: dto.thumbnailImageUrl,
    tags: dto.tags?.join(", ") ?? "",
    createdAt: dto.creationDate,
    updatedAt: dto.modifiedDate,
    storageBytes: dto.storageBytes,
    forkedFromProjectId: dto.forkedFromProjectId,
    forkedFromTitle: dto.forkedFromTitle,
    forkedFromOwnerUsername: dto.forkedFromOwnerUsername,
  };
}

function toItem(dto: ItemDTO, unfiled: boolean): Item {
  return {
    id: String(dto.id),
    title: dto.title,
    titleAlign: (dto.titleAlign as TitleAlign) ?? "center",
    unfiled,
    content: "",
    textStats: { words: 0, characters: 0 },
  };
}

export async function listProjects(): Promise<Project[]> {
  const projects = await apiJson<ProjectDTO[]>(`/api/project`);
  return projects
    .map(toProjectSummary)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface ProjectStorage {
  storageUsedBytes: number;
  storageImageBytes: number;
  storageTextBytes: number;
}

export async function getProjectStorage(id: string): Promise<ProjectStorage> {
  return apiJson<ProjectStorage>(`/api/project/${id}/storage`);
}

export async function getProject(id: string): Promise<Project | null> {
  const projectResponse = await api(`/api/project/${id}`);
  if (projectResponse.status === 404) return null;
  const projectDto = await parseResponse<ProjectDTO>(projectResponse);

  const trailDtos = await apiJson<TrailDTO[]>(`/api/project/${id}/trail`);

  const [trailItemLists, looseDtos, textStats] = await Promise.all([
    Promise.all(
      trailDtos.map((trail) => apiJson<TrailStepDTO[]>(`/api/trail/${trail.id}/item`))
    ),
    apiJson<ItemDTO[]>(`/api/project/${id}/item`),
    apiJson<{ words: number; characters: number; items: { id: number; words: number; characters: number }[] }>(`/api/project/${id}/text-stats`),
  ]);

  const itemMap = new Map<number, ItemDTO>();
  trailItemLists.forEach((steps) => steps.forEach((step) => itemMap.set(step.id, step)));
  looseDtos.forEach((it) => { if (!itemMap.has(it.id)) itemMap.set(it.id, it); });
  const uniqueItemIds = Array.from(itemMap.keys());
  const unfiledIds = new Set(looseDtos.filter((it) => it.unfiled).map((it) => it.id));

  const statsById = new Map(textStats.items.map((stats) => [stats.id, { words: stats.words, characters: stats.characters }]));
  const items: Record<string, Item> = {};
  uniqueItemIds.forEach((itemId) => {
    const dto = itemMap.get(itemId)!;
    items[String(itemId)] = {
      ...toItem(dto, unfiledIds.has(itemId)),
      content: null,
      textStats: statsById.get(itemId) ?? { words: 0, characters: 0 },
    };
  });

  const trails: Trail[] = trailDtos.map((trail, index) => ({
    id: String(trail.id),
    title: trail.title,
    description: trail.description ?? "",
    itemIds: trailItemLists[index].map((step) => String(step.id)),
    steps: trailItemLists[index].map((step) => ({
      itemId: String(step.id),
    })),
    version: trail.version,
    forkedFrom: trail.forkedFromId != null ? String(trail.forkedFromId) : null,
  }));

  return { ...toProjectSummary(projectDto), trails, items };
}

export async function getMapPreviews(id: string): Promise<MapPreviews> {
  return apiJson<MapPreviews>(`/api/project/${id}/map-preview`);
}

export async function startExampleProject(): Promise<{ projectId: string; trailId: number | null; itemId: number }> {
  return apiJson('/api/project/example', { method: 'POST' });
}

export async function saveDraftMetadata(projectId: string, entity: 'project' | 'trail' | 'item', id: string,
  fields: { title?: string; titleAlign?: TitleAlign }, epoch: number): Promise<{ status: number; message?: string; retryAfter?: number; code?: string }> {
  if (!/^[a-zA-Z0-9]+$/.test(projectId) || !Number.isSafeInteger(epoch) || epoch < 0
    || !['project', 'trail', 'item'].includes(entity) || (entity === 'project' ? id !== projectId : !/^\d+$/.test(id))
    || !fields || (fields.title !== undefined && (typeof fields.title !== 'string' || fields.title.length > PROJECT_TEXT_MAX_LENGTH))
    || (fields.titleAlign !== undefined && !['left', 'center', 'right'].includes(fields.titleAlign))) {
    return { status: 400, message: 'Invalid draft metadata.' };
  }
  try {
    const response = await api(`/api/${entity}/${id}`, { method: 'PUT', epoch, projectId, signal: AbortSignal.timeout(15000),
      json: { ...(fields.title !== undefined && { title: fields.title }), ...(fields.titleAlign !== undefined && { titleAlign: fields.titleAlign }) } });
    if (response.ok) return { status: response.status };
    const body = await response.json().catch(() => null);
    const retry = response.headers.get('Retry-After');
    return { status: response.status, code: typeof body?.code === 'string' ? body.code : undefined, message: typeof body?.message === 'string' ? body.message : `Request failed with status ${response.status}`,
      retryAfter: retry ? Math.max(0, /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now()) : 0 };
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name))) {
      return { status: 503, message: 'Could not reach the server. Your draft is kept locally.' };
    }
    throw error;
  }
}

export async function startExistingProject(projectId: string, trailId?: string, epoch = 0): Promise<{ projectId: string; trailId: number | null; itemId: number }> {
  return apiJson(`/api/project/${projectId}/start${trailId ? `?trailId=${encodeURIComponent(trailId)}` : ''}`, { epoch, method: 'POST' });
}

export async function renameProject(id: string, title: string, epoch = 0): Promise<void> {
  assertProjectText(title, 'title');
  await apiVoid(`/api/project/${id}`, { epoch, method: "PUT", json: { title } });
}

export async function deleteProject(id: string): Promise<void> {
  await apiVoid(`/api/project/${id}`, { method: "DELETE" });
}

export async function setProjectVisibility(
  id: string,
  visibility: ProjectVisibility, epoch = 0
): Promise<{ error: string | null }> {
  return apiResult(`/api/project/${id}`, { epoch, method: "PUT", json: { visibility } });
}

export async function publishProject(id: string, epoch = 0): Promise<{ error: string | null }> {
  return apiResult(`/api/project/${id}/publish`, { epoch, method: "POST" });
}

export async function setProjectThumbnail(id: string, imageUrl: string, epoch = 0): Promise<void> {
  await apiVoid(`/api/project/${id}/thumbnail`, { epoch, method: "PUT", json: { type: "DEDICATED", imageUrl } });
}

export async function searchProjectItems(id: string, q: string): Promise<string[]> {
  const ids = await apiJson<number[]>(`/api/project/${id}/item/search?q=${encodeURIComponent(q)}`);
  return ids.map(String);
}

export async function setProjectDescription(id: string, description: string, epoch = 0): Promise<void> {
  assertProjectText(description, 'description');
  await apiVoid(`/api/project/${id}`, { epoch, method: "PUT", json: { description } });
}

export async function setProjectGraphColors(id: string, graphColors: string, epoch = 0): Promise<void> {
  const saved = await apiJson<{ graphColors: string | null }>(`/api/project/${id}`, { epoch, method: "PUT", json: { graphColors } });
  if (saved.graphColors !== graphColors) throw new Error("Graph colors were not saved");
}

export async function setProjectTags(id: string, tags: string, epoch = 0): Promise<void> {
  const tagNames = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  await apiVoid(`/api/project/${id}`, { epoch, method: "PUT", json: { tags: tagNames } });
}

export interface VoteResult {
  voted: boolean;
  count: number;
}

interface VoteResponseDTO {
  voted: boolean;
  count: number;
}

export async function toggleProjectVote(id: string): Promise<VoteResult> {
  return apiJson<VoteResponseDTO>(`/api/project/${id}/vote`, {
    method: "POST",
    headers: {
      ...(await anonIdHeader()),
    },
  });
}

export async function shareProjectToFollowers(id: string): Promise<void> {
  await apiVoid(`/api/project/${id}/share`, { method: "POST" });
}

export async function forkProject(id: string): Promise<Project> {
  return toProjectSummary(await apiJson<ProjectDTO>(`/api/project/${id}/fork`, { method: "POST" }));
}

interface BookmarkResponseDTO {
  bookmarked: boolean;
}

export async function toggleProjectBookmark(id: string): Promise<boolean> {
  const result = await apiJson<BookmarkResponseDTO>(`/api/project/${id}/bookmark`, { method: "POST" });
  return result.bookmarked;
}

export async function createTrail(projectId: string, title: string, epoch = 0): Promise<Trail> {
  const dto = await apiJson<TrailDTO>(`/api/project/${projectId}/trail`, { epoch, method: "POST", json: { title } });
  return {
    id: String(dto.id),
    title: dto.title,
    description: dto.description ?? "",
    itemIds: [],
    steps: [],
    version: dto.version,
    forkedFrom: dto.forkedFromId != null ? String(dto.forkedFromId) : null,
  };
}

export async function reorderTrailItems(trailId: string, itemIds: string[], epoch = 0): Promise<void> {
  await apiVoid(`/api/trail/${trailId}/item/order`, {
    epoch, method: "PUT",
    json: { itemIds: itemIds.map(Number) },
  });
}

export async function reorderProjectTrails(projectId: string, trailIds: string[], epoch = 0): Promise<void> {
  await apiVoid(`/api/project/${projectId}/trail/order`, { epoch, method: "PUT", json: { trailIds: trailIds.map(Number) } });
}

export async function renameTrail(trailId: string, title: string, epoch = 0): Promise<void> {
  await apiVoid(`/api/trail/${trailId}`, { epoch, method: "PUT", json: { title } });
}

export async function deleteTrail(trailId: string, epoch = 0): Promise<void> {
  await apiVoid(`/api/trail/${trailId}`, { epoch, method: "DELETE" });
}

export async function createItem(trailId: string, title: string, epoch = 0): Promise<Item> {
  const dto = await apiJson<ItemDTO>(`/api/trail/${trailId}/item`, { epoch, method: "POST", json: { title } });
  return toItem(dto, false);
}

export async function createLooseItem(projectId: string, title: string, epoch = 0): Promise<Item> {
  const dto = await apiJson<ItemDTO>(`/api/project/${projectId}/item`, { epoch, method: "POST", json: { title } });
  return toItem(dto, true);
}

export async function deleteItem(itemId: string, epoch = 0, projectId?: string): Promise<void> {
  await apiVoid(`/api/item/${itemId}`, { epoch, projectId, method: "DELETE" });
}

export async function setItemTitleAlign(itemId: string, titleAlign: TitleAlign, epoch = 0, projectId?: string): Promise<void> {
  await apiVoid(`/api/item/${itemId}`, { epoch, projectId, method: "PUT", json: { titleAlign } });
}

export async function attachItemToTrail(trailId: string, itemId: string, epoch = 0): Promise<void> {
  await apiVoid(`/api/trail/${trailId}/item/${itemId}`, { epoch, method: "POST" });
}

export async function detachItemFromTrail(trailId: string, itemId: string, epoch = 0): Promise<void> {
  await apiVoid(`/api/trail/${trailId}/item/${itemId}`, { epoch, method: "DELETE" });
}
