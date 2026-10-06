// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';

import { API_BASE_URL } from "./config";
import { authenticatedFetch } from "./api";
import { expectOk } from "./http";

export interface Comment {
  id: string;
  content: string | null;
  deleted: boolean;
  authorUsername: string | null;
  authorAvatar: string | null;
  authorBadge: string | null;
  parentId: string | null;
  createdDate: string;
  canDelete: boolean;
}

interface CommentDTO {
  id: number;
  content: string | null;
  deleted: boolean;
  authorUsername: string | null;
  authorAvatar: string | null;
  authorBadge: string | null;
  parentId: number | null;
  createdDate: string;
  canDelete: boolean;
}

export interface CommentPage {
  items: Comment[];
  hasMore: boolean;
}

export async function getComments(projectId: string, page = 0, size = 20): Promise<CommentPage> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/public/project/${projectId}/comments?page=${page}&size=${size}`, {
    cache: "no-store",
  });
  if (!response.ok) return { items: [], hasMore: false };
  const data: { content: CommentDTO[]; hasMore: boolean } = await response.json();
  return {
    items: data.content.map((c) => ({
      ...c,
      id: String(c.id),
      parentId: c.parentId != null ? String(c.parentId) : null,
    })),
    hasMore: data.hasMore,
  };
}

export async function postComment(projectId: string, content: string, parentId?: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/project/${projectId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, parentId: parentId ? Number(parentId) : undefined }),
  });
  await expectOk(response);
}

export async function deleteComment(id: string): Promise<void> {
  await authenticatedFetch(`${API_BASE_URL}/api/comment/${id}`, { method: "DELETE" });
}
