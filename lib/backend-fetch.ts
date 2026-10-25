import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { headers } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { API_BASE_URL } from '@/lib/config';

export async function backendFetch(
  input: string | URL,
  options: RequestInit & { next?: { tags?: string[]; revalidate?: number | false } } = {},
  incomingHeaders?: Headers,
): Promise<Response> {
  const url = new URL(input);
  if (url.origin !== new URL(API_BASE_URL).origin) throw new Error('Invalid backend origin');
  const method = (options.method ?? 'GET').toUpperCase();
  const shared = options.cache === 'force-cache';
  if (shared && (method !== 'GET' || options.body || options.headers ||
    !(url.pathname.startsWith('/api/public/content/') ||
      ['/api/public/sitemap/projects', '/api/public/sitemap/users'].includes(url.pathname)))) {
    throw new Error('Shared backend caching requires an anonymous public GET');
  }
  const secret = process.env.BFF_SIGNING_KEY;
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('BFF_SIGNING_KEY is required');
  if (!secret) return fetch(input, options);
  const key = Buffer.from(secret, 'base64');
  if (key.length < 32) throw new Error('BFF signing key must contain at least 32 bytes');
  let ip = 'public-cache';
  if (!shared) {
    const header = process.env.TRUSTED_IP_HEADER;
    if (!header) throw new Error('TRUSTED_IP_HEADER is required');
    const incoming = incomingHeaders ?? await headers();
    const forwarded = incoming.get(header);
    if (!forwarded || !isIP(forwarded)) throw new Error('Missing or invalid trusted client IP');
    ip = forwarded;
  }
  const send = async () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const outgoing = new Headers(options.headers);
    outgoing.set('X-Tramo-Client-IP', ip);
    outgoing.set('X-Tramo-Timestamp', timestamp);
    outgoing.set('X-Tramo-Signature', createHmac('sha256', key)
      .update(`${ip}\n${timestamp}\n${method}\n${url.pathname}${url.search}`).digest('hex'));
    return fetch(input, { ...options, ...(shared && { cache: 'no-store', next: undefined }), headers: outgoing });
  };
  if (!shared) return send();
  const cached = await unstable_cache(async () => {
    const response = await send();
    if (!response.ok && response.status !== 404) throw new Error(`Public backend request failed: ${response.status}`);
    return { body: await response.text(), status: response.status, headers: Array.from(response.headers.entries()) };
  }, ['backend-public', url.href], options.next)();
  return new Response(cached.body, { status: cached.status, headers: cached.headers });
}
