// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { API_BASE_URL } from './config';
import { setAuthCookies } from './auth';

export type GoogleAuthResult =
  | { success: true; requiresBirthDate: boolean }
  | { success: false; error: string };

export async function googleAuthHandler(idToken: string): Promise<GoogleAuthResult> {
  const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    let message = 'Google sign-in failed. Please try again.';
    try {
      const data = await response.json();
      if (typeof data?.message === 'string') message = data.message;
    } catch {
    }
    return { success: false, error: message };
  }

  const data = await response.json();

  if (!data.accessToken || !data.refreshToken) {
    return { success: false, error: 'Google sign-in failed. Please try again.' };
  }

  await setAuthCookies({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    username: typeof data.username === 'string' ? data.username : undefined,
  });

  return { success: true, requiresBirthDate: !!data.requiresBirthDate };
}
