'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type RegisterResult = {
  error?: string;
};

export async function registerHandler(
  prevState: RegisterResult | null,
  formData: FormData
): Promise<RegisterResult | null> {
    console.log(formData)
  const username = formData.get('username');
  const email = formData.get('email');
  const password = formData.get('password');

  const response = await fetch('http://localhost:8080/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  });

  if (!response.ok) {
    return { error: 'Invalid credentials' };
  }

  const data = await response.json();
  
  if (!data.accessToken || !data.refreshToken) {
    return { error: 'Authentication failed - no tokens received' };
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

  if (typeof username === 'string' && username) {
    cookieStore.set('username', username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
  }

  redirect('/');
}