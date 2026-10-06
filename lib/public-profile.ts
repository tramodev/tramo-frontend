// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';

import { API_BASE_URL } from "./config";
import { authHeaders, isLoggedIn } from "./auth";
import { authenticatedFetch } from "./api";
import { parseResponse } from "./http";
import { toFeedItem, type ProjectFeedItem, type ProjectFeedItemDTO } from "./feed";
import type { ProfileStats, Badge } from "./profile";

async function publicProfileFetch(url: string): Promise<Response> {
  if (await isLoggedIn()) {
    return authenticatedFetch(url, { cache: "no-store" });
  }
  return fetch(url, { cache: "no-store", headers: await authHeaders() });
}

interface PublicProfileDTO {
  username: string;
  bio: string | null;
  age: number | null;
  location: string | null;
  website: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  createdAt: string;
  stats: ProfileStats;
  badges: Badge[];
  selectedBadge: string | null;
  following: boolean;
  self: boolean;
  blocked: boolean;
  showUpvotes: boolean;
}

export interface PublicProfile {
  username: string;
  bio: string | null;
  age: number | null;
  location: string | null;
  website: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  createdAt: string;
  stats: ProfileStats;
  badges: Badge[];
  selectedBadge: string | null;
  following: boolean;
  self: boolean;
  blocked: boolean;
  showUpvotes: boolean;
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const response = await publicProfileFetch(`${API_BASE_URL}/api/public/users/${encodeURIComponent(username)}`);
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
  const response = await publicProfileFetch(`${API_BASE_URL}/api/public/users/${encodeURIComponent(username)}/${kind}?page=${page}&size=${size}`);
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

async function fetchProjectPage(kind: "published" | "upvoted", username: string, page: number, size: number): Promise<ProfilePage<ProjectFeedItem>> {
  const response = await publicProfileFetch(`${API_BASE_URL}/api/public/users/${encodeURIComponent(username)}/${kind}?page=${page}&size=${size}`);
  if (!response.ok) return { items: [], hasMore: false };
  const data: PageResponseDTO<ProjectFeedItemDTO> = await response.json();
  return { items: data.content.map(toFeedItem), hasMore: data.hasMore };
}

export async function getPublicUserPublishedPage(username: string, page: number, size: number): Promise<ProfilePage<ProjectFeedItem>> {
  return fetchProjectPage("published", username, page, size);
}

export async function getPublicUserUpvotedPage(username: string, page: number, size: number): Promise<ProfilePage<ProjectFeedItem>> {
  return fetchProjectPage("upvoted", username, page, size);
}
