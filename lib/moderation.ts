// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';

import { API_BASE_URL } from "@/lib/config";
import { authenticatedFetch } from "@/lib/api";
import { expectOk } from "@/lib/http";

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
  projectId: string | null;
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
  await expectOk(response);
}

export async function reportComment(commentId: string, reason: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/comment/${commentId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  await expectOk(response);
}

export interface ReportPage { items: Report[]; hasMore: boolean }
export async function listReports(page = 0, type = "ALL", status = "OPEN"): Promise<ReportPage> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/reports?page=${page}&size=20&type=${encodeURIComponent(type)}&status=${encodeURIComponent(status)}`, { cache: "no-store" });
  await expectOk(response);
  const data: { content: ReportDTO[]; hasMore: boolean } = await response.json();
  return { items: data.content.map(r => ({ ...r, id: String(r.id), commentId: r.commentId != null ? String(r.commentId) : null })), hasMore: data.hasMore };
}

export async function upholdCommentReport(id: string, reason?: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/comment-reports/${id}/uphold`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }),
  });
  await expectOk(response);
}

export async function dismissReport(id: string, type: "PROJECT" | "COMMENT" = "PROJECT"): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/reports/${id}/dismiss?type=${type}`, { method: "POST" });
  await expectOk(response);
}

export async function searchAdminUsers(q: string): Promise<AdminUser[]> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users?q=${encodeURIComponent(q)}`);
  await expectOk(response);
  const data: AdminUserDTO[] = await response.json();
  return data.map((u) => ({ ...u, id: String(u.id) }));
}

export async function banUser(id: string, reason?: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users/${id}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  await expectOk(response);
}

export async function unbanUser(id: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/users/${id}/unban`, { method: "POST" });
  await expectOk(response);
}

export async function unpublishProject(id: string, reason?: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/admin/projects/${id}/unpublish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  await expectOk(response);
}
