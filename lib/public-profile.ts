'use server';

import { API_BASE_URL } from "./config";
import { getAccessToken } from "./auth";
import { authenticatedFetch } from "./api";
import type { ProfileStats, Badge } from "./profile";
import type { ProjectFeedItem } from "./public-project";

async function optionalAuthHeaders(): Promise<HeadersInit | undefined> {
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
  forkCount: number;
  featured: boolean;
}

interface PublicProfileDTO {
  username: string;
  bio: string | null;
  imageUrl: string | null;
  createdAt: string;
  stats: ProfileStats;
  badges: Badge[];
  published: ProjectFeedItemDTO[];
  following: boolean;
  self: boolean;
}

export interface PublicProfile {
  username: string;
  bio: string | null;
  imageUrl: string | null;
  createdAt: string;
  stats: ProfileStats;
  badges: Badge[];
  published: ProjectFeedItem[];
  following: boolean;
  self: boolean;
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
    forkCount: item.forkCount,
    featured: item.featured,
  };
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const response = await fetch(`${API_BASE_URL}/api/public/users/${encodeURIComponent(username)}`, {
    cache: "no-store",
    headers: await optionalAuthHeaders(),
  });
  if (!response.ok) return null;
  const data: PublicProfileDTO = await response.json();
  return { ...data, published: data.published.map(toFeedItem) };
}

export async function toggleFollow(username: string): Promise<{ following: boolean; followersCount: number }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/users/${encodeURIComponent(username)}/follow`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json();
}
