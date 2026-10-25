// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { backendFetch } from '@/lib/backend-fetch';
import { redirect } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import { setAuthCookies } from '@/lib/auth';

export type AuthResult = {
  error?: string;
  needsVerification?: boolean;
  captchaRequired?: boolean;
};

export async function authenticateHandler(
  prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult | null> {
  const username = formData.get('username');
  const password = formData.get('password');
  const captchaToken = formData.get('captchaToken');

  const response = await backendFetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, captchaToken }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const captchaRequired = data?.code === 'CAPTCHA_REQUIRED';
    return {
      error: captchaRequired ? 'Please try again to complete the security check.'
        : typeof data?.message === 'string' ? data.message : 'Invalid credentials',
      needsVerification: response.status === 403
        && data?.message === 'Please verify your email before logging in.',
      captchaRequired: captchaRequired || prevState?.captchaRequired,
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
