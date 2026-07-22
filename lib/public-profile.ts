'use server';

import { API_BASE_URL } from "./config";
import { authHeaders } from "./auth";
import { authenticatedFetch } from "./api";
import { parseResponse } from "./http";
import { toFeedItem, type ProjectFeedItem, type ProjectFeedItemDTO } from "./feed";
import type { ProfileStats, Badge } from "./profile";

interface PublicProfileDTO {
  username: string;
  bio: string | null;
  imageUrl: string | null;
  createdAt: string;
  stats: ProfileStats;
  badges: Badge[];
  following: boolean;
  self: boolean;
  blocked: boolean;
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
  blocked: boolean;
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const response = await fetch(`${API_BASE_URL}/api/public/users/${encodeURIComponent(username)}`, {
    cache: "no-store",
    headers: await authHeaders(),
  });
  if (!response.ok) return null;
  const data: PublicProfileDTO = await response.json();
  return data;
}

export async function toggleFollow(username: string): Promise<{ following: boolean; followersCount: number }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/users/${encodeURIComponent(username)}/follow`, {
    method: "POST",
  });
  return parseResponse<{ following: boolean; followersCount: number }>(response);
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
    headers: await authHeaders(),
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
    headers: await authHeaders(),
  });
  if (!response.ok) return { items: [], hasMore: false };
  const data: PageResponseDTO<ProjectFeedItemDTO> = await response.json();
  return { items: data.content.map(toFeedItem), hasMore: data.hasMore };
}
