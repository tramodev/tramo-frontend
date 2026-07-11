'use server';

export type ResendVerificationResult = {
  sent: boolean;
};

// Always reports success regardless of whether the account exists or is
// already verified — matches the backend's anti-enumeration behavior.
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
