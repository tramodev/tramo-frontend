'use server';
import { cookies } from 'next/headers';

export type VerifyEmailResult =
  | { success: true }
  | { success: false; error: string };

export async function verifyEmailHandler(token: string): Promise<VerifyEmailResult> {
  const response = await fetch('http://localhost:8080/api/auth/verify-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    let message = 'This verification link is invalid or has expired.';
    try {
      const data = await response.json();
      if (typeof data?.message === 'string') message = data.message;
    } catch {
      // Response wasn't JSON — keep the fallback message.
    }
    return { success: false, error: message };
  }

  const data = await response.json();

  if (!data.accessToken || !data.refreshToken) {
    return { success: false, error: 'Verification succeeded, but login failed. Please log in manually.' };
  }

  const cookieStore = await cookies();

  cookieStore.set('accessToken', data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15,
    path: '/',
  });

  cookieStore.set('refreshToken', data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  if (typeof data.username === 'string' && data.username) {
    cookieStore.set('username', data.username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
  }

  return { success: true };
}
