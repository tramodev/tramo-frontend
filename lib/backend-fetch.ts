import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { headers } from 'next/headers';
import { API_BASE_URL } from '@/lib/config';

export async function backendFetch(
  input: string | URL,
  options: RequestInit = {},
  incomingHeaders?: Headers,
): Promise<Response> {
  const url = new URL(input);
  if (url.origin !== new URL(API_BASE_URL).origin) throw new Error('Invalid backend origin');
  const secret = process.env.BFF_SIGNING_KEY;
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('BFF_SIGNING_KEY is required');
  if (!secret) return fetch(input, options);
  const key = Buffer.from(secret, 'base64');
  if (key.length < 32) throw new Error('BFF signing key must contain at least 32 bytes');
  let ip = '127.0.0.1';
  if (options.cache !== 'force-cache') {
    const incoming = incomingHeaders ?? await headers();
    if (process.env.VERCEL === '1') {
      const forwarded = incoming.get('x-vercel-forwarded-for');
      if (!forwarded || !isIP(forwarded)) throw new Error('Missing Vercel client IP');
      ip = forwarded;
    }
  }
  const outgoing = new Headers(options.headers);
  outgoing.set('X-Tramo-Client-IP', ip);
  outgoing.set('X-Tramo-Signature', createHmac('sha256', key)
    .update(`${ip}\n${(options.method ?? 'GET').toUpperCase()}\n${url.pathname}${url.search}`).digest('hex'));
  return fetch(input, { ...options, headers: outgoing });
}
