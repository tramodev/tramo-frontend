// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { backendFetch } from '@/lib/backend-fetch';
import { API_BASE_URL } from '@/lib/config';

export type ResetPasswordResult =
  | { success: true }
  | { success: false; error: string };

export async function resetPasswordHandler(
  token: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  const response = await backendFetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!response.ok) {
    let message = 'This reset link is invalid or has expired.';
    try {
      const data = await response.json();
      if (typeof data?.message === 'string') message = data.message;
    } catch {
    }
    return { success: false, error: message };
  }

  return { success: true };
}
