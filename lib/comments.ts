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
  parentId: number | null;
  createdDate: string;
  canDelete: boolean;
}

export async function getComments(projectId: string): Promise<Comment[]> {
  const response = await fetch(`${API_BASE_URL}/api/public/project/${projectId}/comments`, {
    cache: "no-store",
  });
  if (!response.ok) return [];
  const data: CommentDTO[] = await response.json();
  return data.map((c) => ({
    ...c,
    id: String(c.id),
    parentId: c.parentId != null ? String(c.parentId) : null,
  }));
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
