'use server';

import { API_BASE_URL } from "./config";

export interface PublicIdea {
  id: string;
  title: string;
  type: string | null;
  content: string;
}

export interface PublicPath {
  id: string;
  title: string;
  ideas: PublicIdea[];
}

export interface PublicProject {
  id: string;
  title: string;
  description: string | null;
  ownerUsername: string;
  modifiedDate: string;
  paths: PublicPath[];
}

interface PublicIdeaDTO {
  id: number;
  title: string;
  type: string | null;
  content: string;
}

interface PublicPathDTO {
  id: number;
  title: string;
  ideas: PublicIdeaDTO[];
}

interface PublicProjectDTO {
  id: number;
  title: string;
  description: string | null;
  ownerUsername: string;
  modifiedDate: string;
  paths: PublicPathDTO[];
}

export interface ProjectFeedItem {
  id: string;
  title: string;
  description: string | null;
  ownerUsername: string;
  thumbnail: string | null;
  tags: string[];
  modifiedDate: string;
}

interface ProjectFeedItemDTO {
  id: number;
  title: string;
  description: string | null;
  ownerUsername: string;
  thumbnail: string | null;
  tags: string | null;
  modifiedDate: string;
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
}

export async function getPublishedFeed(query?: string): Promise<ProjectFeedItem[]> {
  const url = new URL(`${API_BASE_URL}/api/public/projects`);
  if (query) url.searchParams.set("q", query);

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) return [];

  const data: ProjectFeedItemDTO[] = await response.json();
  return data.map((item) => ({
    id: String(item.id),
    title: item.title,
    description: item.description,
    ownerUsername: item.ownerUsername,
    thumbnail: item.thumbnail,
    tags: parseTags(item.tags),
    modifiedDate: item.modifiedDate,
  }));
}

export interface TagCount {
  tag: string;
  count: number;
}

export async function getHotTopics(): Promise<TagCount[]> {
  const response = await fetch(`${API_BASE_URL}/api/public/tags`, {
    cache: "no-store",
  });

  if (!response.ok) return [];
  return response.json();
}

// Returns null for both "not found" and "not public" — the backend 404s either
// way so a private project's existence can't be probed via this page.
export async function getPublicProject(projectId: string): Promise<PublicProject | null> {
  const response = await fetch(`${API_BASE_URL}/api/public/project/${projectId}`, {
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data: PublicProjectDTO = await response.json();

  return {
    id: String(data.id),
    title: data.title,
    description: data.description,
    ownerUsername: data.ownerUsername,
    modifiedDate: data.modifiedDate,
    paths: data.paths.map((path) => ({
      id: String(path.id),
      title: path.title,
      ideas: path.ideas.map((idea) => ({
        id: String(idea.id),
        title: idea.title,
        type: idea.type,
        content: idea.content,
      })),
    })),
  };
}
