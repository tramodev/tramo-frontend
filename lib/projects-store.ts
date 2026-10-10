// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';

import { headers } from "next/headers";
import { Item, Trail, TitleAlign } from "@/app/editor/types";
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";
import { parseResponse, expectOk } from "./http";
import { anonIdHeader } from "./public-project";

export type ProjectVisibility = "private" | "unlisted" | "published";
export type MapPreviews = Record<string, { text: string; linkedItemIds: string[] }>;

export interface Project {
  id: string;
  title: string;
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

type ApiInit = Omit<RequestInit, "body"> & { json?: unknown };

function api(path: string, init: ApiInit = {}): Promise<Response> {
  const { json, headers: extraHeaders, ...rest } = init;
  return authenticatedFetch(`${API_BASE_URL}${path}`, {
    ...rest,
    ...(json !== undefined && { body: JSON.stringify(json) }),
    headers: { ...(json !== undefined ? jsonHeaders : undefined), ...extraHeaders },
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

interface EditorBootstrapDTO {
  id: string;
  title: string;
  description: string | null;
  graphColors: string | null;
  visibility: ProjectVisibility;
  tags: string[];
  trails: { id: number; title: string; description: string | null; version: number; forkedFromId: number | null; itemIds: number[] }[];
  items: { id: number; title: string; titleAlign: string | null; unfiled: boolean; words: number; characters: number }[];
  selectedItemId: number | null;
  selectedTrailId: number | null;
  contents: { id: number; content: string; extractionEpoch: number }[];
  username: string;
  imageUrl: string | null;
}

export async function getEditorBootstrap(id: string, noteId?: string | null, trailId?: string | null) {
  const params = new URLSearchParams();
  if (noteId && /^\d+$/.test(noteId)) params.set('noteId', noteId);
  if (trailId && /^\d+$/.test(trailId)) params.set('trailId', trailId);
  const response = await api(`/api/project/${id}/editor${params.size ? `?${params}` : ''}`);
  if (response.status === 404) return null;
  const dto = await parseResponse<EditorBootstrapDTO>(response);
  const items: Record<string, Item> = Object.fromEntries(dto.items.map((item) => [String(item.id), {
    id: String(item.id), title: item.title, titleAlign: (item.titleAlign as TitleAlign) ?? 'center',
    unfiled: item.unfiled, content: null, textStats: { words: item.words, characters: item.characters },
  }]));
  const trails: Trail[] = dto.trails.map((trail) => ({
    id: String(trail.id), title: trail.title, description: trail.description ?? '',
    version: trail.version, forkedFrom: trail.forkedFromId == null ? null : String(trail.forkedFromId),
    itemIds: trail.itemIds.map(String), steps: trail.itemIds.map((itemId) => ({ itemId: String(itemId) })),
  }));
  return {
    project: { id: dto.id, title: dto.title, description: dto.description ?? '', graphColors: dto.graphColors,
      visibility: dto.visibility, tags: dto.tags.join(', '), trails, items } as Project,
    selectedItemId: dto.selectedItemId == null ? undefined : String(dto.selectedItemId),
    selectedTrailId: dto.selectedTrailId == null ? undefined : String(dto.selectedTrailId),
    contents: dto.contents,
    profile: { username: dto.username, imageUrl: dto.imageUrl },
  };
}

export async function getMapPreviews(id: string): Promise<MapPreviews> {
  return apiJson<MapPreviews>(`/api/project/${id}/map-preview`);
}

export async function startExampleProject(): Promise<{ projectId: string; trailId: number | null; itemId: number }> {
  return apiJson('/api/project/example', { method: 'POST' });
}

export async function startProject(requestId: string): Promise<{ projectId: string; trailId: number | null; itemId: number }> {
  return apiJson('/api/project/start', { method: 'POST', json: { requestId } });
}

export async function startExistingProject(projectId: string, trailId?: string): Promise<{ projectId: string; trailId: number | null; itemId: number }> {
  return apiJson(`/api/project/${projectId}/start${trailId ? `?trailId=${encodeURIComponent(trailId)}` : ''}`, { method: 'POST' });
}

export async function renameProject(id: string, title: string): Promise<void> {
  await apiVoid(`/api/project/${id}`, { method: "PUT", json: { title } });
}

export async function deleteProject(id: string): Promise<void> {
  await apiVoid(`/api/project/${id}`, { method: "DELETE" });
}

export async function setProjectVisibility(
  id: string,
  visibility: ProjectVisibility,
): Promise<{ error: string | null }> {
  return apiResult(`/api/project/${id}`, { method: "PUT", json: { visibility } });
}

export async function publishProject(id: string): Promise<{ error: string | null }> {
  return apiResult(`/api/project/${id}/publish`, { method: "POST" });
}

export async function setProjectThumbnail(id: string, imageUrl: string): Promise<void> {
  await apiVoid(`/api/project/${id}/thumbnail`, { method: "PUT", json: { type: "DEDICATED", imageUrl } });
}

export async function searchProjectItems(id: string, q: string): Promise<string[]> {
  const ids = await apiJson<number[]>(`/api/project/${id}/item/search?q=${encodeURIComponent(q)}`);
  return ids.map(String);
}

export async function setProjectDescription(id: string, description: string): Promise<void> {
  await apiVoid(`/api/project/${id}`, { method: "PUT", json: { description } });
}

export async function setProjectGraphColors(id: string, graphColors: string): Promise<void> {
  const saved = await apiJson<{ graphColors: string | null }>(`/api/project/${id}`, { method: "PUT", json: { graphColors } });
  if (saved.graphColors !== graphColors) throw new Error("Graph colors were not saved");
}

export async function setProjectTags(id: string, tags: string): Promise<void> {
  const tagNames = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  await apiVoid(`/api/project/${id}`, { method: "PUT", json: { tags: tagNames } });
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
  const clientIp = (await headers()).get("x-forwarded-for");
  return apiJson<VoteResponseDTO>(`/api/project/${id}/vote`, {
    method: "POST",
    headers: {
      ...(clientIp ? { "X-Forwarded-For": clientIp } : undefined),
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

export async function createTrail(projectId: string, title: string): Promise<Trail> {
  const dto = await apiJson<TrailDTO>(`/api/project/${projectId}/trail`, { method: "POST", json: { title } });
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

export async function reorderTrailItems(trailId: string, itemIds: string[]): Promise<void> {
  await apiVoid(`/api/trail/${trailId}/item/order`, {
    method: "PUT",
    json: { itemIds: itemIds.map(Number) },
  });
}

export async function renameTrail(trailId: string, title: string): Promise<void> {
  await apiVoid(`/api/trail/${trailId}`, { method: "PUT", json: { title } });
}

export async function setTrailDescription(trailId: string, description: string): Promise<void> {
  await apiVoid(`/api/trail/${trailId}`, { method: "PUT", json: { description } });
}

export async function deleteTrail(trailId: string): Promise<void> {
  await apiVoid(`/api/trail/${trailId}`, { method: "DELETE" });
}

export async function createItem(trailId: string, title: string): Promise<Item> {
  const dto = await apiJson<ItemDTO>(`/api/trail/${trailId}/item`, { method: "POST", json: { title } });
  return toItem(dto, false);
}

export async function createLooseItem(projectId: string, title: string): Promise<Item> {
  const dto = await apiJson<ItemDTO>(`/api/project/${projectId}/item`, { method: "POST", json: { title } });
  return toItem(dto, true);
}

export async function deleteItem(itemId: string): Promise<void> {
  await apiVoid(`/api/item/${itemId}`, { method: "DELETE" });
}

export async function renameItem(itemId: string, title: string): Promise<void> {
  await apiVoid(`/api/item/${itemId}`, { method: "PUT", json: { title } });
}

export async function setItemTitleAlign(itemId: string, titleAlign: TitleAlign): Promise<void> {
  await apiVoid(`/api/item/${itemId}`, { method: "PUT", json: { titleAlign } });
}

export async function attachItemToTrail(trailId: string, itemId: string): Promise<void> {
  await apiVoid(`/api/trail/${trailId}/item/${itemId}`, { method: "POST" });
}

export async function detachItemFromTrail(trailId: string, itemId: string): Promise<void> {
  await apiVoid(`/api/trail/${trailId}/item/${itemId}`, { method: "DELETE" });
}
