'use server';

export type ResetPasswordResult =
  | { success: true }
  | { success: false; error: string };

export async function resetPasswordHandler(
  token: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  const response = await fetch('http://localhost:8080/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!response.ok) {
    let message = 'This reset link is invalid or has expired.';
    try {
      const data = await response.json();
      if (typeof data?.message === 'string') message = data.message;
    } catch {
      // Response wasn't JSON — keep the fallback message.
    }
    return { success: false, error: message };
  }

  return { success: true };
}
