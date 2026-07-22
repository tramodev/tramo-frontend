'use server';

import { API_BASE_URL } from "./config";
import { authHeaders } from "./auth";
import { authenticatedFetch } from "./api";
import { parseResponse } from "./http";
import { toFeedItem, type ProjectFeedItem, type ProjectFeedItemDTO } from "./feed";

export type { ProjectFeedItem } from "./feed";

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
  trailsPublished: number;
  upvotesReceived: number;
  totalViews: number;
  forksCount: number;
  followersCount: number;
  followingCount: number;
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
  return parseResponse<UserProfile>(response);
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
