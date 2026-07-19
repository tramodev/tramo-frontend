'use server';

import { headers } from "next/headers";
import { Idea, Path, TitleAlign } from "@/app/editor/types";
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";
import { anonIdHeader } from "./public-project";

export type ProjectVisibility = "private" | "unlisted" | "published";

export interface Project {
  id: string;
  title: string;
  description: string;
  paths: Path[];
  ideas: Record<string, Idea>;
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

interface PathDTO {
  id: number;
  title: string;
  visibility: string | null;
  creationDate: string;
  modifiedDate: string;
  projectId: number;
}

interface IdeaDTO {
  id: number;
  title: string;
  type: string | null;
  titleAlign: string | null;
  createdDate: string;
  modifiedDate: string;
}

const jsonHeaders = { "Content-Type": "application/json" };

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

async function expectOk(response: Response): Promise<void> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}

function toProjectSummary(dto: ProjectDTO): Project {
  return {
    id: String(dto.id),
    title: dto.title,
    description: dto.description ?? "",
    paths: [],
    ideas: {},
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

  const pathsResponse = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}/path`);
  const pathDtos = await parseResponse<PathDTO[]>(pathsResponse);

  const pathIdeaLists = await Promise.all(
    pathDtos.map((path) =>
      authenticatedFetch(`${API_BASE_URL}/api/path/${path.id}/idea`).then((r) =>
        parseResponse<IdeaDTO[]>(r)
      )
    )
  );

  const ideaMap = new Map<number, IdeaDTO>();
  pathIdeaLists.forEach((ideaDtos) => {
    ideaDtos.forEach((idea) => ideaMap.set(idea.id, idea));
  });
  const uniqueIdeaIds = Array.from(ideaMap.keys());

  const linkLists = await Promise.all(
    uniqueIdeaIds.map((ideaId) =>
      authenticatedFetch(`${API_BASE_URL}/api/idea/${ideaId}/link`).then((r) =>
        parseResponse<IdeaDTO[]>(r)
      )
    )
  );

  const ideas: Record<string, Idea> = {};
  uniqueIdeaIds.forEach((ideaId, index) => {
    const dto = ideaMap.get(ideaId)!;
    ideas[String(ideaId)] = {
      id: String(ideaId),
      title: dto.title,
      titleAlign: (dto.titleAlign as TitleAlign) ?? "center",
      content: null,
      linkedIdeaIds: linkLists[index].map((linked) => String(linked.id)),
    };
  });

  const paths: Path[] = pathDtos.map((path, index) => ({
    id: String(path.id),
    title: path.title,
    ideaIds: pathIdeaLists[index].map((idea) => String(idea.id)),
  }));

  return {
    id: String(projectDto.id),
    title: projectDto.title,
    description: projectDto.description ?? "",
    paths,
    ideas,
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

export async function createPath(projectId: string, title: string): Promise<Path> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${projectId}/path`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  });
  const dto = await parseResponse<PathDTO>(response);
  return { id: String(dto.id), title: dto.title, ideaIds: [] };
}

export async function renamePath(pathId: string, title: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/path/${pathId}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  });
  await expectOk(response);
}

export async function deletePath(pathId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/path/${pathId}`, {
    method: "DELETE",
  });
  await expectOk(response);
}

export async function createIdea(pathId: string, title: string): Promise<Idea> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/path/${pathId}/idea`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  });
  const dto = await parseResponse<IdeaDTO>(response);
  return { id: String(dto.id), title: dto.title, titleAlign: (dto.titleAlign as TitleAlign) ?? "center", content: "", linkedIdeaIds: [] };
}

export async function renameIdea(ideaId: string, title: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/idea/${ideaId}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
  });
  await expectOk(response);
}

export async function setIdeaTitleAlign(ideaId: string, titleAlign: TitleAlign): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/idea/${ideaId}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ titleAlign }),
  });
  await expectOk(response);
}

export async function attachIdeaToPath(pathId: string, ideaId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/path/${pathId}/idea/${ideaId}`, {
    method: "POST",
  });
  await expectOk(response);
}

export async function detachIdeaFromPath(pathId: string, ideaId: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/path/${pathId}/idea/${ideaId}`, {
    method: "DELETE",
  });
  await expectOk(response);
}

export async function linkIdeas(ideaId: string, otherIdeaId: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/idea/${ideaId}/link/${otherIdeaId}`,
    { method: "POST" }
  );
  await expectOk(response);
}

export async function unlinkIdeas(ideaId: string, otherIdeaId: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/idea/${ideaId}/link/${otherIdeaId}`,
    { method: "DELETE" }
  );
  await expectOk(response);
}
