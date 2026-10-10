// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';

import { cookies } from "next/headers";
import { API_BASE_URL, EXPLORE_PAGE_SIZE } from "./config";
import { authHeaders } from "./auth";
import { toFeedItem, type ProjectFeedItem, type ProjectFeedItemDTO } from "./feed";
import type { TitleAlign } from "@/app/editor/types";

export type { ProjectFeedItem } from "./feed";

export async function anonIdHeader(): Promise<HeadersInit | undefined> {
  const anonId = (await cookies()).get("tramo_anon_id")?.value;
  return anonId ? { "X-Anon-Id": anonId } : undefined;
}

export interface PublicItem {
  id: string;
  title: string;
  type: string | null;
  content: string;
  titleAlign: TitleAlign;
}

export interface PublicTrail {
  id: string;
  title: string;
  description: string;
  version: number;
  forkedFromId: string | null;
  items: PublicItem[];
}

export interface PublicProject {
  id: string;
  title: string;
  description: string | null;
  ownerUsername: string;
  modifiedDate: string;
  thumbnailImageUrl: string | null;
  trails: PublicTrail[];
  looseItems: PublicItem[];
  voteCount: number;
  votedByRequester: boolean;
  bookmarkedByRequester: boolean;
  viewCount: number;
  commentCount: number;
  visibility: string;
  forkedFromProjectId: string | null;
  forkedFromTitle: string | null;
  forkedFromOwnerUsername: string | null;
  canFork: boolean;
  canComment: boolean;
}

interface PublicItemDTO {
  id: number;
  title: string;
  type: string | null;
  content: string;
  titleAlign: TitleAlign | null;
}

interface PublicTrailDTO {
  id: number;
  title: string;
  description: string | null;
  version: number;
  forkedFromId: string | null;
  items: PublicItemDTO[];
}

interface PublicProjectDTO {
  id: number;
  title: string;
  description: string | null;
  ownerUsername: string;
  modifiedDate: string;
  thumbnailImageUrl: string | null;
  trails: PublicTrailDTO[];
  looseItems: PublicItemDTO[] | null;
  voteCount: number;
  votedByRequester: boolean;
  bookmarkedByRequester: boolean;
  viewCount: number;
  commentCount: number;
  visibility: string;
  forkedFromProjectId: string | null;
  forkedFromTitle: string | null;
  forkedFromOwnerUsername: string | null;
  canFork: boolean;
  canComment: boolean;
}

export type FeedSort = "recent" | "hot" | "following";

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
  trendingProjects: ProjectFeedItem[];
}

interface ExploreBundleDTO {
  feed: ProjectFeedItemDTO[];
  hasMore: boolean;
  featured: ProjectFeedItemDTO | null;
  hotTopics: TagCount[];
  activeAuthors: AuthorCount[];
  trendingProjects: ProjectFeedItemDTO[];
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

  const response = await fetch(url, { cache: "no-store", headers: await authHeaders() });

  if (!response.ok) return { feed: [], hasMore: false, featured: null, hotTopics: [], activeAuthors: [], trendingProjects: [] };

  const data: ExploreBundleDTO = await response.json();
  return {
    feed: data.feed.map(toFeedItem),
    hasMore: data.hasMore,
    featured: data.featured ? toFeedItem(data.featured) : null,
    hotTopics: data.hotTopics,
    activeAuthors: data.activeAuthors,
    trendingProjects: data.trendingProjects.map(toFeedItem),
  };
}

export interface TagCount {
  tag: string;
  count: number;
}

export async function getPublicProject(projectId: string): Promise<PublicProject | null> {
  const response = await fetch(`${API_BASE_URL}/api/public/project/${projectId}`, {
    cache: "no-store",
    headers: { ...(await authHeaders()), ...(await anonIdHeader()) },
  });

  if (!response.ok) return null;

  const data: PublicProjectDTO = await response.json();

  return {
    id: String(data.id),
    title: data.title,
    description: data.description,
    ownerUsername: data.ownerUsername,
    modifiedDate: data.modifiedDate,
    thumbnailImageUrl: data.thumbnailImageUrl,
    voteCount: data.voteCount,
    votedByRequester: data.votedByRequester,
    bookmarkedByRequester: data.bookmarkedByRequester,
    viewCount: data.viewCount,
    commentCount: data.commentCount,
    visibility: data.visibility,
    forkedFromProjectId: data.forkedFromProjectId,
    forkedFromTitle: data.forkedFromTitle,
    forkedFromOwnerUsername: data.forkedFromOwnerUsername,
    canFork: data.canFork,
    canComment: data.canComment,
    trails: data.trails.map((trail) => ({
      id: String(trail.id),
      title: trail.title,
      description: trail.description ?? "",
      version: trail.version,
      forkedFromId: trail.forkedFromId,
      items: trail.items.map(toPublicItem),
    })),
    looseItems: (data.looseItems ?? []).map(toPublicItem),
  };
}

function toPublicItem(item: PublicItemDTO): PublicItem {
  return {
    id: String(item.id),
    title: item.title,
    type: item.type,
    content: item.content,
    titleAlign: item.titleAlign ?? "center",
  };
}
