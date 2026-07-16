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

interface ProfileStatsBundleDTO {
  stats: ProfileStats;
  badges: Badge[];
}

export interface ProfileStatsBundle {
  stats: ProfileStats | null;
  badges: Badge[];
}

const EMPTY_STATS_BUNDLE: ProfileStatsBundle = { stats: null, badges: [] };

export async function getMyProfileStats(): Promise<ProfileStatsBundle> {
  const response = await fetch(`${API_BASE_URL}/api/profile/stats`, { cache: "no-store", headers: await authHeaders() });
  if (!response.ok) return EMPTY_STATS_BUNDLE;
  const data: ProfileStatsBundleDTO = await response.json();
  return { stats: data.stats, badges: data.badges };
}

interface PageResponseDTO<T> {
  content: T[];
  hasMore: boolean;
}

export interface ProfilePage<T> {
  items: T[];
  hasMore: boolean;
}

async function fetchProfilePage<T, D>(
  path: string,
  page: number,
  size: number,
  map: (item: D) => T
): Promise<ProfilePage<T>> {
  const response = await fetch(`${API_BASE_URL}/api/profile/${path}?page=${page}&size=${size}`, {
    cache: "no-store",
    headers: await authHeaders(),
  });
  if (!response.ok) return { items: [], hasMore: false };
  const data: PageResponseDTO<D> = await response.json();
  return { items: data.content.map(map), hasMore: data.hasMore };
}

export async function getMyPublishedPage(page: number, size: number): Promise<ProfilePage<ProjectFeedItem>> {
  return fetchProfilePage<ProjectFeedItem, ProjectFeedItemDTO>("published", page, size, toFeedItem);
}

export async function getMyBookmarksPage(page: number, size: number): Promise<ProfilePage<ProjectFeedItem>> {
  return fetchProfilePage<ProjectFeedItem, ProjectFeedItemDTO>("bookmarks", page, size, toFeedItem);
}

export async function getMyUpvotedPage(page: number, size: number): Promise<ProfilePage<ProjectFeedItem>> {
  return fetchProfilePage<ProjectFeedItem, ProjectFeedItemDTO>("upvoted", page, size, toFeedItem);
}

export async function getMyForksPage(page: number, size: number): Promise<ProfilePage<ForkFeedItem>> {
  return fetchProfilePage<ForkFeedItem, ForkFeedItemDTO>("forks", page, size, (item) => ({
    ...toFeedItem(item),
    forkedFromProjectId: item.forkedFromProjectId != null ? String(item.forkedFromProjectId) : null,
    forkedFromTitle: item.forkedFromTitle,
    forkedFromOwnerUsername: item.forkedFromOwnerUsername,
  }));
}

export async function getMyActivityPage(page: number, size: number): Promise<ProfilePage<ActivityItem>> {
  return fetchProfilePage<ActivityItem, ActivityItemDTO>("activity", page, size, (item) => ({
    ...item,
    projectId: String(item.projectId),
  }));
}
