// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { redirect } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import { setAuthCookies } from '@/lib/auth';

export type AuthResult = {
  error?: string;
  needsVerification?: boolean;
};

export async function authenticateHandler(
  prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult | null> {
  const username = formData.get('username');
  const password = formData.get('password');

  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    return {
      error: await extractErrorMessage(response),
      needsVerification: response.status === 403,
    };
  }

  const data = await response.json();

  if (!data.accessToken || !data.refreshToken) {
    return { error: 'Authentication failed - no tokens received' };
  }

  await setAuthCookies({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    username: typeof username === 'string' ? username : undefined,
  });

  redirect(data.requiresBirthDate ? '/onboarding/birth-date' : '/');
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.message === 'string') return data.message;
  } catch {
  }
  return 'Invalid credentials';
}
