'use server';

import { API_BASE_URL } from "./config";
import { getAccessToken } from "./auth";
import { authenticatedFetch } from "./api";
import type { ProjectFeedItem } from "./public-project";

async function authHeaders(): Promise<HeadersInit | undefined> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
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
  featured: boolean;
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
  email: string;
  bio: string | null;
  imageUrl: string | null;
  createdAt: string | null;
  role: "ADMIN" | "USER";
}

export interface ProfileStats {
  pathsPublished: number;
  upvotesReceived: number;
  totalViews: number;
  forksCount: number;
  followersCount: number;
}

export interface Badge {
  code: string;
  name: string;
  description: string;
  earned: boolean;
  progress: number;
  target: number;
}

export type ActivityType =
  | "published"
  | "forked"
  | "voted"
  | "bookmarked"
  | "received_vote"
  | "received_fork"
  | "received_bookmark";

interface ActivityItemDTO {
  type: ActivityType;
  timestamp: string;
  projectId: number;
  projectTitle: string;
  otherUsername: string | null;
}

export interface ActivityItem {
  type: ActivityType;
  timestamp: string;
  projectId: string;
  projectTitle: string;
  otherUsername: string | null;
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
    ownerAvatar: item.ownerAvatar,
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

export async function getMyProfile(): Promise<UserProfile | null> {
  const response = await fetch(`${API_BASE_URL}/api/profile/me`, { cache: "no-store", headers: await authHeaders() });
  if (!response.ok) return null;
  return response.json();
}

export async function updateMyProfile(fields: { bio?: string; imageUrl?: string }): Promise<UserProfile> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/profile/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json();
}

interface ProfileBundleDTO {
  stats: ProfileStats;
  badges: Badge[];
  bookmarks: ProjectFeedItemDTO[];
  upvoted: ProjectFeedItemDTO[];
  forks: ForkFeedItemDTO[];
  published: ProjectFeedItemDTO[];
  activity: ActivityItemDTO[];
}

export interface ProfileBundle {
  stats: ProfileStats | null;
  badges: Badge[];
  bookmarks: ProjectFeedItem[];
  upvoted: ProjectFeedItem[];
  forks: ForkFeedItem[];
  published: ProjectFeedItem[];
  activity: ActivityItem[];
}

const EMPTY_BUNDLE: ProfileBundle = { stats: null, badges: [], bookmarks: [], upvoted: [], forks: [], published: [], activity: [] };

export async function getMyProfileBundle(): Promise<ProfileBundle> {
  const response = await fetch(`${API_BASE_URL}/api/profile/bundle`, { cache: "no-store", headers: await authHeaders() });
  if (!response.ok) return EMPTY_BUNDLE;
  const data: ProfileBundleDTO = await response.json();
  return {
    stats: data.stats,
    badges: data.badges,
    bookmarks: data.bookmarks.map(toFeedItem),
    upvoted: data.upvoted.map(toFeedItem),
    forks: data.forks.map((item) => ({
      ...toFeedItem(item),
      forkedFromProjectId: item.forkedFromProjectId != null ? String(item.forkedFromProjectId) : null,
      forkedFromTitle: item.forkedFromTitle,
      forkedFromOwnerUsername: item.forkedFromOwnerUsername,
    })),
    published: data.published.map(toFeedItem),
    activity: data.activity.map((item) => ({ ...item, projectId: String(item.projectId) })),
  };
}
