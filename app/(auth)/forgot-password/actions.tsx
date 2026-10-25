// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { backendFetch } from '@/lib/backend-fetch';
import { redirect } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';

export type ForgotPasswordResult = {
  error?: string;
};

export async function forgotPasswordHandler(
  prevState: ForgotPasswordResult | null,
  formData: FormData
): Promise<ForgotPasswordResult | null> {
  const email = formData.get('email');

  if (typeof email !== 'string' || !email) {
    return { error: 'Email is required' };
  }

  let response: Response;
  try {
    response = await backendFetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch {
    return { error: 'Could not request a reset link. Please try again.' };
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    return { error: typeof data?.message === 'string' ? data.message : 'Could not request a reset link. Please try again.' };
  }

  redirect(`/forgot-password/check-email?email=${encodeURIComponent(email)}`);
}
