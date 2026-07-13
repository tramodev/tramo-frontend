'use server';

export type ResendVerificationResult = {
  sent: boolean;
};

export async function resendVerificationHandler(
  identifier: { username?: string; email?: string }
): Promise<ResendVerificationResult> {
  await fetch('http://localhost:8080/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(identifier),
  });
  return { sent: true };
}
