// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
'use server';
import { backendFetch } from '@/lib/backend-fetch';
import { API_BASE_URL } from '@/lib/config';

export type ContactResult = {
  sent?: boolean;
  error?: string;
};

const TOPICS = ['BUG', 'FEEDBACK', 'BILLING', 'OTHER'];
const FAILURE = 'Could not send your message. Please try again or email contact@tramo.dev.';

export async function contactHandler(
  prevState: ContactResult | null,
  formData: FormData
): Promise<ContactResult> {
  const email = formData.get('email');
  const topic = formData.get('topic');
  const message = formData.get('message');
  const captchaToken = formData.get('captchaToken');

  if (typeof email !== 'string' || !email) return { error: 'Email is required' };
  if (typeof topic !== 'string' || !TOPICS.includes(topic)) return { error: 'Choose a topic' };
  if (typeof message !== 'string' || !message.trim()) return { error: 'Message is required' };
  if (message.length > 2000) return { error: 'Message must be 2000 characters or fewer' };
  if (typeof captchaToken !== 'string' || !captchaToken) return { error: 'Captcha verification failed. Please try again.' };

  let response: Response;
  try {
    response = await backendFetch(`${API_BASE_URL}/api/public/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, topic, message, captchaToken }),
    });
  } catch {
    return { error: FAILURE };
  }

  if (response.status === 429) return { error: 'Too many messages. Please try again later.' };
  if (!response.ok) return { error: FAILURE };
  return { sent: true };
}
