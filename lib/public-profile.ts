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

interface PublicProfileDTO {
  username: string;
  bio: string | null;
  imageUrl: string | null;
  createdAt: string;
  stats: ProfileStats;
  badges: Badge[];
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

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const response = await fetch(`${API_BASE_URL}/api/public/users/${encodeURIComponent(username)}`, {
    cache: "no-store",
    headers: await optionalAuthHeaders(),
  });
  if (!response.ok) return null;
  const data: PublicProfileDTO = await response.json();
  return data;
}

export async function toggleFollow(username: string): Promise<{ following: boolean; followersCount: number }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/users/${encodeURIComponent(username)}/follow`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json();
}

interface FollowUserDTO {
  username: string;
  imageUrl: string | null;
  bio: string | null;
  followingByRequester: boolean;
}

export interface FollowUser {
  username: string;
  imageUrl: string | null;
  bio: string | null;
  followingByRequester: boolean;
}

interface PageResponseDTO<T> {
  content: T[];
  hasMore: boolean;
}

export interface ProfilePage<T> {
  items: T[];
  hasMore: boolean;
}

function toFollowUser(item: FollowUserDTO): FollowUser {
  return { ...item };
}

async function fetchFollowPage(kind: "followers" | "following", username: string, page: number, size: number): Promise<ProfilePage<FollowUser>> {
  const response = await fetch(`${API_BASE_URL}/api/public/users/${encodeURIComponent(username)}/${kind}?page=${page}&size=${size}`, {
    cache: "no-store",
    headers: await optionalAuthHeaders(),
  });
  if (!response.ok) return { items: [], hasMore: false };
  const data: PageResponseDTO<FollowUserDTO> = await response.json();
  return { items: data.content.map(toFollowUser), hasMore: data.hasMore };
}

export async function getFollowersPage(username: string, page: number, size: number): Promise<ProfilePage<FollowUser>> {
  return fetchFollowPage("followers", username, page, size);
}

export async function getFollowingPage(username: string, page: number, size: number): Promise<ProfilePage<FollowUser>> {
  return fetchFollowPage("following", username, page, size);
}

export async function getPublicUserPublishedPage(username: string, page: number, size: number): Promise<ProfilePage<ProjectFeedItem>> {
  const response = await fetch(`${API_BASE_URL}/api/public/users/${encodeURIComponent(username)}/published?page=${page}&size=${size}`, {
    cache: "no-store",
    headers: await optionalAuthHeaders(),
  });
  if (!response.ok) return { items: [], hasMore: false };
  const data: PageResponseDTO<ProjectFeedItemDTO> = await response.json();
  return { items: data.content.map(toFeedItem), hasMore: data.hasMore };
}
