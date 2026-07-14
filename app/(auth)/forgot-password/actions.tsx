'use server';
import { redirect } from 'next/navigation';

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

  await fetch('http://localhost:8080/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  redirect(`/forgot-password/check-email?email=${encodeURIComponent(email)}`);
}
