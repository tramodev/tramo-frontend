'use server';

import { API_BASE_URL } from "./config";
import { authenticatedFetch } from "./api";

export interface Report {
  id: string;
  type: "PROJECT" | "COMMENT";
  projectId: string | null;
  projectTitle: string | null;
  commentId: string | null;
  commentContent: string | null;
  reporterUsername: string;
  reason: string;
  status: string;
  createdDate: string;
}

interface ReportDTO {
  id: number;
  type: "PROJECT" | "COMMENT";
  projectId: number | null;
  projectTitle: string | null;
  commentId: number | null;
  commentContent: string | null;
  reporterUsername: string;
  reason: string;
  status: string;
  createdDate: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  banned: boolean;
}

interface AdminUserDTO {
  id: number;
  username: string;
  email: string;
  role: string;
  banned: boolean;
}

export async function reportProject(projectId: string, reason: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${projectId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
}

export async function reportComment(commentId: string, reason: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/comment/${commentId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
}

export async function listReports(): Promise<Report[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/reports`);
  if (!response.ok) return [];
  const data: ReportDTO[] = await response.json();
  return data.map((r) => ({
    ...r,
    id: String(r.id),
    projectId: r.projectId != null ? String(r.projectId) : null,
    commentId: r.commentId != null ? String(r.commentId) : null,
  }));
}

export async function dismissReport(id: string, type: "PROJECT" | "COMMENT" = "PROJECT"): Promise<void> {
  await authenticatedFetch(`${API_BASE_URL}/api/admin/reports/${id}/dismiss?type=${type}`, { method: "POST" });
}

export async function searchAdminUsers(q: string): Promise<AdminUser[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users?q=${encodeURIComponent(q)}`);
  if (!response.ok) return [];
  const data: AdminUserDTO[] = await response.json();
  return data.map((u) => ({ ...u, id: String(u.id) }));
}

export async function banUser(id: string, reason?: string): Promise<void> {
  await authenticatedFetch(`${API_BASE_URL}/api/admin/users/${id}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
}

export async function unbanUser(id: string): Promise<void> {
  await authenticatedFetch(`${API_BASE_URL}/api/admin/users/${id}/unban`, { method: "POST" });
}

export async function unpublishProject(id: string, reason?: string): Promise<void> {
  await authenticatedFetch(`${API_BASE_URL}/api/admin/projects/${id}/unpublish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
}
