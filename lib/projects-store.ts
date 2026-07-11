'use server';

import { Idea, Path } from "@/app/dashboard/types";
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";

export type ProjectVisibility = "private" | "public";

export interface Project {
  id: string;
  title: string;
  paths: Path[];
  ideas: Record<string, Idea>;
  visibility: ProjectVisibility;
  createdAt: string;
  updatedAt: string;
}

// Data-access layer for projects. Backed by the mypath-backend REST API.
// Idea `content` (the Lexical editor state) has no backend persistence yet,
// so it always round-trips as an empty string.

interface ProjectDTO {
  id: number;
  title: string;
  description: string | null;
  visibility: ProjectVisibility | null;
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
    paths: [],
    ideas: {},
    visibility: dto.visibility ?? "private",
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
      content: "",
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
    paths,
    ideas,
    visibility: projectDto.visibility ?? "private",
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
): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ visibility }),
  });
  await expectOk(response);
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
  return { id: String(dto.id), title: dto.title, content: "", linkedIdeaIds: [] };
}

export async function renameIdea(ideaId: string, title: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/idea/${ideaId}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify({ title }),
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
