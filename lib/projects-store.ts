'use server';

import { headers } from "next/headers";
import { Item, Trail, TitleAlign, Association, AssociationType, AssociationTargetType } from "@/app/editor/types";
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
  // Only present on /api/project/{id}/item responses (sticky Unfiled flag).
  unfiled?: boolean;
}

// A trail step: item fields + per-step metadata (GET /trail/{id}/item).
interface TrailStepDTO extends ItemDTO {
  annotation: string | null;
  associationId: string | null;
}

interface AssociationDTO {
  id: string;
  type: string;
  targetType: string;
  targetId: string;
  targetTitle: string;
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

  const [trailItemLists, looseDtos] = await Promise.all([
    Promise.all(
      trailDtos.map((trail) =>
        authenticatedFetch(`${API_BASE_URL}/api/trail/${trail.id}/item`).then((r) =>
          parseResponse<TrailStepDTO[]>(r)
        )
      )
    ),
    authenticatedFetch(`${API_BASE_URL}/api/project/${id}/item`).then((r) => parseResponse<ItemDTO[]>(r)),
  ]);

  // All items (trail members + loose), keyed by id, for title/titleAlign + associations.
  const itemMap = new Map<number, ItemDTO>();
  trailItemLists.forEach((steps) => steps.forEach((step) => itemMap.set(step.id, step)));
  looseDtos.forEach((it) => { if (!itemMap.has(it.id)) itemMap.set(it.id, it); });
  const uniqueItemIds = Array.from(itemMap.keys());
  // The project-items endpoint carries the sticky Unfiled flag for every item.
  const unfiledIds = new Set(looseDtos.filter((it) => it.unfiled).map((it) => it.id));

  const associationLists = await Promise.all(
    uniqueItemIds.map((itemId) =>
      authenticatedFetch(`${API_BASE_URL}/api/item/${itemId}/association`).then((r) =>
        parseResponse<AssociationDTO[]>(r)
      )
    )
  );

  const items: Record<string, Item> = {};
  uniqueItemIds.forEach((itemId, index) => {
    const dto = itemMap.get(itemId)!;
    const associations: Association[] = associationLists[index].map((a) => ({
      id: String(a.id),
      type: a.type as AssociationType,
      targetType: a.targetType as AssociationTargetType,
      targetId: a.targetId,
      targetTitle: a.targetTitle,
    }));
    items[String(itemId)] = {
      id: String(itemId),
      title: dto.title,
      titleAlign: (dto.titleAlign as TitleAlign) ?? "center",
      unfiled: unfiledIds.has(itemId),
      content: null,
      associations,
      linkedItemIds: associations
        .filter((a) => a.targetType === "ITEM")
        .map((a) => a.targetId),
    };
  });

  const trails: Trail[] = trailDtos.map((trail, index) => ({
    id: String(trail.id),
    title: trail.title,
    description: trail.description ?? "",
    itemIds: trailItemLists[index].map((step) => String(step.id)),
    steps: trailItemLists[index].map((step) => ({
      itemId: String(step.id),
      annotation: step.annotation,
      associationId: step.associationId,
    })),
    version: trail.version,
    forkedFrom: trail.forkedFromId != null ? String(trail.forkedFromId) : null,
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

// "blaze": set a step's annotation and/or the association used to reach it.
export async function updateStep(
  trailId: string,
  itemId: string,
  fields: { annotation?: string | null; associationId?: string | null },
): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/trail/${trailId}/item/${itemId}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({
      annotation: fields.annotation ?? null,
      associationId: fields.associationId != null ? Number(fields.associationId) : null,
    }),
  });
  await expectOk(response);
}

export async function renameTrail(trailId: string, title: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/trail/${trailId}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  });
  await expectOk(response);
}

export async function setTrailDescription(trailId: string, description: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/trail/${trailId}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ description }),
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
  return { id: String(dto.id), title: dto.title, titleAlign: (dto.titleAlign as TitleAlign) ?? "center", unfiled: false, content: "", associations: [], linkedItemIds: [] };
}

// A loose item — belongs to the project and (stickily) to Unfiled.
export async function createLooseItem(projectId: string, title: string): Promise<Item> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${projectId}/item`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  });
  const dto = await parseResponse<ItemDTO>(response);
  return { id: String(dto.id), title: dto.title, titleAlign: (dto.titleAlign as TitleAlign) ?? "center", unfiled: true, content: "", associations: [], linkedItemIds: [] };
}

export async function deleteItem(itemId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/item/${itemId}`, {
    method: "DELETE",
  });
  await expectOk(response);
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

// Create a typed association ("tie") from an item to another item or a whole trail.
export async function tie(
  itemId: string,
  targetId: string,
  targetType: AssociationTargetType = "ITEM",
  type: AssociationType = "RELATED",
): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/item/${itemId}/tie`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ type, targetType, targetId: Number(targetId) }),
  });
  await expectOk(response);
}

export async function untie(
  itemId: string,
  targetId: string,
  targetType: AssociationTargetType = "ITEM",
): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/item/${itemId}/tie?targetType=${targetType}&targetId=${targetId}`,
    { method: "DELETE" }
  );
  await expectOk(response);
}

// Back-compat helper for the editor's untyped item↔item links (mention/wiki plugins).
export async function linkItems(itemId: string, otherItemId: string): Promise<void> {
  await tie(itemId, otherItemId, "ITEM", "RELATED");
}
