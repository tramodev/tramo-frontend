// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { redirect } from 'next/navigation';
import { API_BASE_URL } from '@/lib/config';

const PASSWORD_COMPLEXITY_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/;

export type RegisterErrors = {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  birthDate?: string;
  general?: string;
};

export type RegisterResult = {
  errors?: RegisterErrors;
};

export async function registerHandler(
  prevState: RegisterResult | null,
  formData: FormData
): Promise<RegisterResult | null> {
  const username = formData.get('username');
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirm-password');
  const captchaToken = formData.get('captchaToken');
  const birthDate = formData.get('birthDate');

  if (typeof captchaToken !== 'string' || !captchaToken) {
    return { errors: { general: 'Captcha verification failed. Please try again.' } };
  }

  if (typeof password === 'string' && !PASSWORD_COMPLEXITY_PATTERN.test(password)) {
    return {
      errors: {
        password: 'Password must contain at least one uppercase letter, one number, and one symbol',
      },
    };
  }

  if (password !== confirmPassword) {
    return { errors: { confirmPassword: 'Passwords do not match' } };
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password, captchaToken, birthDate }),
  });

  if (!response.ok) {
    return { errors: await extractFieldErrors(response) };
  }

  redirect(`/signup/check-email?email=${encodeURIComponent(typeof email === 'string' ? email : '')}`);
}

async function extractFieldErrors(response: Response): Promise<RegisterErrors> {
  try {
    const data = await response.json();
    if (data?.errors && typeof data.errors === 'object') {
      return data.errors as RegisterErrors;
    }
    if (typeof data?.message === 'string') {
      return { general: data.message };
    }
  } catch {
  }
  return { general: 'Something went wrong. Please try again.' };
}
