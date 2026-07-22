'use server';
import { API_BASE_URL } from './config';

export type ResendVerificationResult = {
  sent: boolean;
};

export async function resendVerificationHandler(
  identifier: { username?: string; email?: string }
): Promise<ResendVerificationResult> {
  await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(identifier),
  });
  return { sent: true };
}
