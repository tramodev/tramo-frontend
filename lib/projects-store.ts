'use server';

import { headers } from "next/headers";
import { Item, Trail, TitleAlign } from "@/app/editor/types";
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";
import { parseResponse, expectOk } from "./http";
import { anonIdHeader } from "./public-project";

export type ProjectVisibility = "private" | "unlisted" | "published";

export interface Project {
  id: string;
  title: string;
  description: string;
  trails: Trail[];
  items: Record<string, Item>;
  visibility: ProjectVisibility;
  thumbnail: string | null;
  tags: string;
  createdAt: string;
  updatedAt: string;
}


interface ProjectDTO {
  id: number;
  title: string;
  description: string | null;
  visibility: ProjectVisibility | null;
  thumbnail: string | null;
  tags: string | null;
  creationDate: string;
  modifiedDate: string;
}

interface TrailDTO {
  id: number;
  title: string;
  visibility: string | null;
  creationDate: string;
  modifiedDate: string;
  projectId: number;
}

interface ItemDTO {
  id: number;
  title: string;
  type: string | null;
  titleAlign: string | null;
  createdDate: string;
  modifiedDate: string;
}

const jsonHeaders = { "Content-Type": "application/json" };

function toProjectSummary(dto: ProjectDTO): Project {
  return {
    id: String(dto.id),
    title: dto.title,
    description: dto.description ?? "",
    trails: [],
    items: {},
    visibility: dto.visibility ?? "private",
    thumbnail: dto.thumbnail,
    tags: dto.tags ?? "",
    createdAt: dto.creationDate,
    updatedAt: dto.modifiedDate,
  };
}

export async function listProjects(): Promise<Project[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project`);
  const projects = await parseResponse<ProjectDTO[]>(response);
  return projects
    .map(toProjectSummary)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(id: string): Promise<Project | null> {
  const projectResponse = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}`);
  if (projectResponse.status === 404) return null;
  const projectDto = await parseResponse<ProjectDTO>(projectResponse);

  const trailsResponse = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}/trail`);
  const trailDtos = await parseResponse<TrailDTO[]>(trailsResponse);

  const trailItemLists = await Promise.all(
    trailDtos.map((trail) =>
      authenticatedFetch(`${API_BASE_URL}/api/trail/${trail.id}/item`).then((r) =>
        parseResponse<ItemDTO[]>(r)
      )
    )
  );

  const itemMap = new Map<number, ItemDTO>();
  trailItemLists.forEach((itemDtos) => {
    itemDtos.forEach((item) => itemMap.set(item.id, item));
  });
  const uniqueItemIds = Array.from(itemMap.keys());

  const linkLists = await Promise.all(
    uniqueItemIds.map((itemId) =>
      authenticatedFetch(`${API_BASE_URL}/api/item/${itemId}/link`).then((r) =>
        parseResponse<ItemDTO[]>(r)
      )
    )
  );

  const items: Record<string, Item> = {};
  uniqueItemIds.forEach((itemId, index) => {
    const dto = itemMap.get(itemId)!;
    items[String(itemId)] = {
      id: String(itemId),
      title: dto.title,
      titleAlign: (dto.titleAlign as TitleAlign) ?? "center",
      content: null,
      linkedItemIds: linkLists[index].map((linked) => String(linked.id)),
    };
  });

  const trails: Trail[] = trailDtos.map((trail, index) => ({
    id: String(trail.id),
    title: trail.title,
    itemIds: trailItemLists[index].map((item) => String(item.id)),
  }));

  return {
    id: String(projectDto.id),
    title: projectDto.title,
    description: projectDto.description ?? "",
    trails,
    items,
    visibility: projectDto.visibility ?? "private",
    thumbnail: projectDto.thumbnail,
    tags: projectDto.tags ?? "",
    createdAt: projectDto.creationDate,
    updatedAt: projectDto.modifiedDate,
  };
}

export async function createProject(title: string): Promise<Project> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  });
  return toProjectSummary(await parseResponse<ProjectDTO>(response));
}

export async function renameProject(id: string, title: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  });
  await expectOk(response);
}

export async function deleteProject(id: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}`, {
    method: "DELETE",
  });
  await expectOk(response);
}

export async function setProjectVisibility(
  id: string,
  visibility: ProjectVisibility,
): Promise<{ error: string | null }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ visibility }),
  });
  if (!response.ok) {
    // surface backend limit messages (e.g. weekly publish cap) instead of a generic failure
    const message = await response.json().then((body) => body?.message).catch(() => null);
    return { error: message ?? `Request failed with status ${response.status}` };
  }
  return { error: null };
}

export async function setProjectThumbnail(id: string, thumbnail: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ thumbnail }),
  });
  await expectOk(response);
}

export async function setProjectDescription(id: string, description: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ description }),
  });
  await expectOk(response);
}

export async function setProjectTags(id: string, tags: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ tags }),
  });
  await expectOk(response);
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
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}/vote`, {
    method: "POST",
    headers: {
      ...(clientIp ? { "X-Forwarded-For": clientIp } : undefined),
      ...(await anonIdHeader()),
    },
  });
  return parseResponse<VoteResponseDTO>(response);
}

export async function shareProjectToFollowers(id: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}/share`, {
    method: "POST",
  });
  await expectOk(response);
}

export async function forkProject(id: string): Promise<Project> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}/fork`, {
    method: "POST",
  });
  return toProjectSummary(await parseResponse<ProjectDTO>(response));
}

interface BookmarkResponseDTO {
  bookmarked: boolean;
}

export async function toggleProjectBookmark(id: string): Promise<boolean> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}/bookmark`, {
    method: "POST",
  });
  return (await parseResponse<BookmarkResponseDTO>(response)).bookmarked;
}

export async function createTrail(projectId: string, title: string): Promise<Trail> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${projectId}/trail`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  });
  const dto = await parseResponse<TrailDTO>(response);
  return { id: String(dto.id), title: dto.title, itemIds: [] };
}

export async function renameTrail(trailId: string, title: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/trail/${trailId}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  });
  await expectOk(response);
}

export async function deleteTrail(trailId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/trail/${trailId}`, {
    method: "DELETE",
  });
  await expectOk(response);
}

export async function createItem(trailId: string, title: string): Promise<Item> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/trail/${trailId}/item`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  });
  const dto = await parseResponse<ItemDTO>(response);
  return { id: String(dto.id), title: dto.title, titleAlign: (dto.titleAlign as TitleAlign) ?? "center", content: "", linkedItemIds: [] };
}

export async function renameItem(itemId: string, title: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/item/${itemId}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  });
  await expectOk(response);
}

export async function setItemTitleAlign(itemId: string, titleAlign: TitleAlign): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/item/${itemId}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ titleAlign }),
  });
  await expectOk(response);
}

export async function attachItemToTrail(trailId: string, itemId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/trail/${trailId}/item/${itemId}`, {
    method: "POST",
  });
  await expectOk(response);
}

export async function detachItemFromTrail(trailId: string, itemId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/trail/${trailId}/item/${itemId}`, {
    method: "DELETE",
  });
  await expectOk(response);
}

export async function linkItems(itemId: string, otherItemId: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/item/${itemId}/link/${otherItemId}`,
    { method: "POST" }
  );
  await expectOk(response);
}

export async function unlinkItems(itemId: string, otherItemId: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/item/${itemId}/link/${otherItemId}`,
    { method: "DELETE" }
  );
  await expectOk(response);
}
