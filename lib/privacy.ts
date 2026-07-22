'use server';
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";
import { parseResponse } from "./http";

export type ProfileVisibility = "public" | "private";
export type CommentsPolicy = "everyone" | "following" | "noone";

export interface PrivacySettings {
  profileVisibility: ProfileVisibility;
  showUpvotes: boolean;
  allowForks: boolean;
  commentsPolicy: CommentsPolicy;
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const response = await authenticatedFetch(`${API_BASE_URL}/user/preferences`);
  return parseResponse<PrivacySettings>(response);
}

export async function updatePrivacySettings(partial: Partial<PrivacySettings>): Promise<{ error: string | null }> {
  const response = await authenticatedFetch(`${API_BASE_URL}/user/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  if (!response.ok) {
    return { error: `Request failed with status ${response.status}` };
  }
  return { error: null };
}
