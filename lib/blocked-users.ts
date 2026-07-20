'use server';
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";

export interface BlockedUser {
  username: string;
  imageUrl: string | null;
  bio: string | null;
}

interface BlockedUserDTO {
  username: string;
  imageUrl: string | null;
  bio: string | null;
}

interface PageResponseDTO<T> {
  content: T[];
  hasMore: boolean;
}

export interface BlockedUsersPage {
  items: BlockedUser[];
  hasMore: boolean;
}

export async function toggleBlock(username: string): Promise<{ blocked: boolean }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/users/${encodeURIComponent(username)}/block`, {
    method: "POST",
  });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json();
}

export async function getBlockedUsersPage(page: number, size: number): Promise<BlockedUsersPage> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/users/blocked?page=${page}&size=${size}`);
  if (!response.ok) return { items: [], hasMore: false };
  const data: PageResponseDTO<BlockedUserDTO> = await response.json();
  return { items: data.content, hasMore: data.hasMore };
}
