// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";
import { parseResponse } from "./http";
import type { ProjectRole } from "./projects-store";

export type MemberRole = Exclude<ProjectRole, "OWNER">;

export interface ProjectMember {
  username: string;
  imageUrl: string | null;
  role: ProjectRole;
  viaLink: boolean;
}

export interface ShareLink {
  id: number;
  role: MemberRole;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  useCount: number;
  token: string | null;
}

type Result<T> = { data: T; error: null; status: number } | { data: null; error: string; status: number };

const jsonHeaders = { "Content-Type": "application/json" };

async function request<T>(path: string, init: RequestInit = {}): Promise<Result<T>> {
  const response = await authenticatedFetch(`${API_BASE_URL}${path}`, init);
  if (response.ok) return { data: (response.status === 204 ? null : await response.json()) as T, error: null, status: response.status };
  const message = await response.json().then((body) => body?.message).catch(() => null);
  return { data: null, error: message ?? `Request failed with status ${response.status}`, status: response.status };
}

function membersPath(projectId: string) {
  return `/api/project/${encodeURIComponent(projectId)}/members`;
}

function linksPath(projectId: string) {
  return `/api/project/${encodeURIComponent(projectId)}/share-links`;
}

export async function listMembers(projectId: string): Promise<ProjectMember[]> {
  return parseResponse<ProjectMember[]>(await authenticatedFetch(`${API_BASE_URL}${membersPath(projectId)}`));
}

export async function addMember(projectId: string, username: string, role: MemberRole): Promise<Result<ProjectMember>> {
  const result = await request<ProjectMember>(membersPath(projectId), { method: "POST", headers: jsonHeaders, body: JSON.stringify({ username, role }) });
  return result.status === 404 ? { data: null, error: "No user with that username.", status: 404 } : result;
}

export async function changeMemberRole(projectId: string, username: string, role: MemberRole): Promise<Result<ProjectMember>> {
  return request(`${membersPath(projectId)}/${encodeURIComponent(username)}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ role }) });
}

export async function removeMember(projectId: string, username: string): Promise<Result<null>> {
  return request(`${membersPath(projectId)}/${encodeURIComponent(username)}`, { method: "DELETE" });
}

export async function listShareLinks(projectId: string): Promise<ShareLink[]> {
  return parseResponse<ShareLink[]>(await authenticatedFetch(`${API_BASE_URL}${linksPath(projectId)}`));
}

export async function createShareLink(projectId: string, role: MemberRole): Promise<Result<ShareLink>> {
  return request(linksPath(projectId), { method: "POST", headers: jsonHeaders, body: JSON.stringify({ role }) });
}

export async function revokeShareLink(projectId: string, linkId: number): Promise<Result<null>> {
  return request(`${linksPath(projectId)}/${linkId}`, { method: "DELETE" });
}

export async function acceptShareLink(token: string): Promise<Result<{ projectId: string }>> {
  return request(`/api/share-links/accept`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ token }) });
}
