// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { authenticatedFetch } from "./api";
import { API_BASE_URL } from "./config";
import { parseResponse } from "./http";
import type { NotificationType } from "./notifications";

export interface NotificationPreferences {
  notificationsEnabled: boolean;
  mutedNotificationTypes: NotificationType[];
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await authenticatedFetch(`${API_BASE_URL}/user/preferences`);
  const data = await parseResponse<NotificationPreferences>(response);
  return {
    notificationsEnabled: data.notificationsEnabled,
    mutedNotificationTypes: data.mutedNotificationTypes ?? [],
  };
}

export async function updateNotificationPreferences(
  partial: Partial<NotificationPreferences>
): Promise<{ error: string | null }> {
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
