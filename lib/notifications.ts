// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';

import { API_BASE_URL } from "./config";
import { authenticatedFetch } from "./api";

export type NotificationType = "UPVOTE" | "FORK" | "FOLLOW" | "BADGE" | "FEATURED" | "PUBLISH" | "SHARE" | "COMMENT";

interface NotificationDTO {
  id: number;
  type: NotificationType;
  projectId: number | null;
  projectTitle: string | null;
  badgeCode: string | null;
  badgeName: string | null;
  latestActorUsername: string | null;
  count: number;
  read: boolean;
  updatedDate: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  projectId: string | null;
  projectTitle: string | null;
  badgeCode: string | null;
  badgeName: string | null;
  latestActorUsername: string | null;
  count: number;
  read: boolean;
  updatedDate: string;
}

export async function getUnreadCount(): Promise<number> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/notifications/unread-count`);
  if (!response.ok) return 0;
  const data: { unreadCount: number } = await response.json();
  return data.unreadCount;
}

export interface NotificationPage {
  items: AppNotification[];
  hasMore: boolean;
}

export async function getNotifications(page = 0, size = 20): Promise<NotificationPage> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/notifications?page=${page}&size=${size}`);
  if (!response.ok) return { items: [], hasMore: false };
  const data: { content: NotificationDTO[]; hasMore: boolean } = await response.json();
  return {
    items: data.content.map((n) => ({
      ...n,
      id: String(n.id),
      projectId: n.projectId != null ? String(n.projectId) : null,
    })),
    hasMore: data.hasMore,
  };
}

export async function markAllNotificationsRead(): Promise<void> {
  await authenticatedFetch(`${API_BASE_URL}/api/notifications/read`, { method: "POST" });
}

export async function deleteNotification(id: string): Promise<void> {
  await authenticatedFetch(`${API_BASE_URL}/api/notifications/${id}`, { method: "DELETE" });
}
