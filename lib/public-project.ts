'use server';

import { cookies } from "next/headers";
import { API_BASE_URL, EXPLORE_PAGE_SIZE } from "./config";
import { getAccessToken } from "./auth";
import type { TitleAlign } from "@/app/editor/types";

async function optionalAuthHeaders(): Promise<HeadersInit | undefined> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function anonIdHeader(): Promise<HeadersInit | undefined> {
  const anonId = (await cookies()).get("tramo_anon_id")?.value;
  return anonId ? { "X-Anon-Id": anonId } : undefined;
}

export interface PublicIdea {
  id: string;
  title: string;
  type: string | null;
  content: string;
  titleAlign: TitleAlign;
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
  voteCount: number;
  votedByRequester: boolean;
  bookmarkedByRequester: boolean;
  viewCount: number;
  commentCount: number;
}

interface PublicIdeaDTO {
  id: number;
  title: string;
  type: string | null;
  content: string;
  titleAlign: TitleAlign | null;
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
  voteCount: number;
  votedByRequester: boolean;
  bookmarkedByRequester: boolean;
  viewCount: number;
  commentCount: number;
}

export interface ProjectFeedItem {
  id: string;
  title: string;
  description: string | null;
  ownerUsername: string;
  ownerAvatar: string | null;
  thumbnail: string | null;
  tags: string[];
  modifiedDate: string;
  voteCount: number;
  votedByRequester: boolean;
  bookmarkedByRequester: boolean;
  viewCount: number;
  forkCount: number;
  commentCount: number;
  featured: boolean;
}

interface ProjectFeedItemDTO {
  id: number;
  title: string;
  description: string | null;
  ownerUsername: string;
  ownerAvatar: string | null;
  thumbnail: string | null;
  tags: string | null;
  modifiedDate: string;
  voteCount: number;
  votedByRequester: boolean;
  bookmarkedByRequester: boolean;
  viewCount: number;
  forkCount: number;
  commentCount: number;
  featured: boolean;
}

export type FeedSort = "recent" | "hot" | "following";

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function toFeedItem(item: ProjectFeedItemDTO): ProjectFeedItem {
  return {
    id: String(item.id),
    title: item.title,
    description: item.description,
    ownerUsername: item.ownerUsername,
    ownerAvatar: item.ownerAvatar,
    thumbnail: item.thumbnail,
    tags: parseTags(item.tags),
    modifiedDate: item.modifiedDate,
    voteCount: item.voteCount,
    votedByRequester: item.votedByRequester,
    bookmarkedByRequester: item.bookmarkedByRequester,
    viewCount: item.viewCount,
    forkCount: item.forkCount,
    commentCount: item.commentCount,
    featured: item.featured,
  };
}

export interface AuthorCount {
  username: string;
  avatar: string | null;
  count: number;
}

export interface ExploreBundle {
  feed: ProjectFeedItem[];
  hasMore: boolean;
  featured: ProjectFeedItem | null;
  hotTopics: TagCount[];
  activeAuthors: AuthorCount[];
}

interface ExploreBundleDTO {
  feed: ProjectFeedItemDTO[];
  hasMore: boolean;
  featured: ProjectFeedItemDTO | null;
  hotTopics: TagCount[];
  activeAuthors: AuthorCount[];
}

export async function getExploreBundle(
  query?: string,
  sort: FeedSort = "recent",
  page: number = 0,
  size: number = EXPLORE_PAGE_SIZE
): Promise<ExploreBundle> {
  const url = new URL(`${API_BASE_URL}/api/public/explore`);
  if (query) url.searchParams.set("q", query);
  url.searchParams.set("sort", sort);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));

  const response = await fetch(url, { cache: "no-store", headers: await optionalAuthHeaders() });

  if (!response.ok) return { feed: [], hasMore: false, featured: null, hotTopics: [], activeAuthors: [] };

  const data: ExploreBundleDTO = await response.json();
  return {
    feed: data.feed.map(toFeedItem),
    hasMore: data.hasMore,
    featured: data.featured ? toFeedItem(data.featured) : null,
    hotTopics: data.hotTopics,
    activeAuthors: data.activeAuthors,
  };
}

export interface TagCount {
  tag: string;
  count: number;
}

export async function getPublicProject(projectId: string): Promise<PublicProject | null> {
  const response = await fetch(`${API_BASE_URL}/api/public/project/${projectId}`, {
    cache: "no-store",
    headers: { ...(await optionalAuthHeaders()), ...(await anonIdHeader()) },
  });

  if (!response.ok) return null;

  const data: PublicProjectDTO = await response.json();

  return {
    id: String(data.id),
    title: data.title,
    description: data.description,
    ownerUsername: data.ownerUsername,
    modifiedDate: data.modifiedDate,
    voteCount: data.voteCount,
    votedByRequester: data.votedByRequester,
    bookmarkedByRequester: data.bookmarkedByRequester,
    viewCount: data.viewCount,
    commentCount: data.commentCount,
    paths: data.paths.map((path) => ({
      id: String(path.id),
      title: path.title,
      ideas: path.ideas.map((idea) => ({
        id: String(idea.id),
        title: idea.title,
        type: idea.type,
        content: idea.content,
        titleAlign: idea.titleAlign ?? "center",
      })),
    })),
  };
}
