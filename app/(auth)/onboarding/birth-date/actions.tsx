// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { redirect } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';
import { getAccessToken, setAuthCookies } from '@/lib/auth';

export type BirthDateResult = { error: string } | null;

export async function submitBirthDateHandler(
  prevState: BirthDateResult,
  formData: FormData
): Promise<BirthDateResult> {
  const birthDate = formData.get('birthDate');
  const accessToken = await getAccessToken();

  if (!accessToken) {
    redirect('/login');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/birth-date`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ birthDate }),
  });

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    try {
      const data = await response.json();
      if (typeof data?.message === 'string') message = data.message;
    } catch {
    }
    return { error: message };
  }

  const data = await response.json();
  if (data.accessToken && data.refreshToken) {
    await setAuthCookies({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  }

  redirect('/');
}
