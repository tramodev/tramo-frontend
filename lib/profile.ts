'use server';

import { API_BASE_URL } from "./config";
import { getAccessToken } from "./auth";
import type { ProjectFeedItem } from "./public-project";

// Server Components can't refresh the access token mid-render (cookies() is
// read-only outside a Server Action / Route Handler — see authenticatedFetch
// in lib/api.ts, which does refresh and is only safe to call from a Server
// Action or a Client Component's useEffect). These profile reads run during
// this page's render, so they use the current token as-is and degrade to an
// empty/null result on a 401 rather than trying to refresh it.
async function authHeaders(): Promise<HeadersInit | undefined> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

interface ProjectFeedItemDTO {
  id: number;
  title: string;
  description: string | null;
  ownerUsername: string;
  thumbnail: string | null;
  tags: string | null;
  modifiedDate: string;
  voteCount: number;
  votedByRequester: boolean;
  bookmarkedByRequester: boolean;
  viewCount: number;
}

interface ForkFeedItemDTO extends ProjectFeedItemDTO {
  forkedFromProjectId: number | null;
  forkedFromTitle: string | null;
  forkedFromOwnerUsername: string | null;
}

export interface ForkFeedItem extends ProjectFeedItem {
  forkedFromProjectId: string | null;
  forkedFromTitle: string | null;
  forkedFromOwnerUsername: string | null;
}

export interface UserProfile {
  username: string;
  bio: string | null;
  imageUrl: string | null;
}

export interface ProfileStats {
  pathsPublished: number;
  upvotesReceived: number;
  totalViews: number;
  forksCount: number;
}

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
    thumbnail: item.thumbnail,
    tags: parseTags(item.tags),
    modifiedDate: item.modifiedDate,
    voteCount: item.voteCount,
    votedByRequester: item.votedByRequester,
    bookmarkedByRequester: item.bookmarkedByRequester,
    viewCount: item.viewCount,
  };
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const response = await fetch(`${API_BASE_URL}/api/profile/me`, { cache: "no-store", headers: await authHeaders() });
  if (!response.ok) return null;
  return response.json();
}

export async function getMyStats(): Promise<ProfileStats | null> {
  const response = await fetch(`${API_BASE_URL}/api/profile/stats`, { cache: "no-store", headers: await authHeaders() });
  if (!response.ok) return null;
  return response.json();
}

export async function getMyBookmarks(): Promise<ProjectFeedItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/profile/bookmarks`, { cache: "no-store", headers: await authHeaders() });
  if (!response.ok) return [];
  const data: ProjectFeedItemDTO[] = await response.json();
  return data.map(toFeedItem);
}

export async function getMyUpvoted(): Promise<ProjectFeedItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/profile/upvoted`, { cache: "no-store", headers: await authHeaders() });
  if (!response.ok) return [];
  const data: ProjectFeedItemDTO[] = await response.json();
  return data.map(toFeedItem);
}

export async function getMyForks(): Promise<ForkFeedItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/profile/forks`, { cache: "no-store", headers: await authHeaders() });
  if (!response.ok) return [];
  const data: ForkFeedItemDTO[] = await response.json();
  return data.map((item) => ({
    ...toFeedItem(item),
    forkedFromProjectId: item.forkedFromProjectId != null ? String(item.forkedFromProjectId) : null,
    forkedFromTitle: item.forkedFromTitle,
    forkedFromOwnerUsername: item.forkedFromOwnerUsername,
  }));
}
