import { expect, test } from '@jest/globals';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const KEY = 'dGVzdC1iZmYtc2lnbmluZy1rZXktdGVzdC1iZmYta2V5';

function setup(env = {}, incoming = new Headers()) {
  const exports = {}, calls = [];
  let headerReads = 0;
  runInNewContext(ts.transpileModule(readFileSync('lib/backend-fetch.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL, Headers, Buffer,
    process: { env: { NODE_ENV: 'production', VERCEL: '1', BFF_SIGNING_KEY: KEY, ...env } },
    require: name => ({
      'node:crypto': { createHmac },
      'node:net': { isIP },
      'next/headers': { headers: async () => { headerReads++; return incoming; } },
      '@/lib/config': { API_BASE_URL: 'https://api.tramo.test' },
    })[name] ?? {},
    fetch: async (...args) => { calls.push(args); return new Response('ok'); },
  });
  return { fetch: exports.backendFetch, calls, headerReads: () => headerReads };
}

test.each(['1.2.3.4', '2001:db8::1'])('signs the Vercel IP %s and ignores spoofed forwarding headers', async ip => {
  const s = setup({}, new Headers({ 'x-vercel-forwarded-for': ip, 'x-forwarded-for': '9.9.9.9' }));
  const signal = AbortSignal.timeout(1000);
  await s.fetch('https://api.tramo.test/api/auth/login', {
    method: 'POST', body: 'payload', cache: 'no-store', signal,
    headers: { Authorization: 'Bearer token', 'X-Tramo-Client-IP': 'forged', 'X-Tramo-Signature': 'forged' },
  });
  const [, options] = s.calls[0];
  expect(options.headers.get('X-Tramo-Client-IP')).toBe(ip);
  expect(options.headers.get('X-Tramo-Signature')).toBe(createHmac('sha256', Buffer.from(KEY, 'base64'))
    .update(`${ip}\nPOST\n/api/auth/login`).digest('hex'));
  expect(options.headers.get('Authorization')).toBe('Bearer token');
  expect(options.body).toBe('payload');
  expect(options.signal).toBe(signal);
});

test('rejects requests without a trustworthy Vercel IP or a production signing key', async () => {
  for (const headers of [new Headers(), new Headers({ 'x-vercel-forwarded-for': '1.2.3.4, 5.6.7.8' })]) {
    const s = setup({}, headers);
    await expect(s.fetch('https://api.tramo.test/api/auth/login')).rejects.toThrow('Missing Vercel client IP');
    expect(s.calls).toHaveLength(0);
  }
  await expect(setup({ BFF_SIGNING_KEY: '' }).fetch('https://api.tramo.test/api/auth/login')).rejects.toThrow('BFF_SIGNING_KEY');
  await expect(setup({ BFF_SIGNING_KEY: 'c2hvcnQ=' }).fetch('https://api.tramo.test/api/auth/login')).rejects.toThrow('32 bytes');
  await expect(setup().fetch('https://external.test/api/auth/login')).rejects.toThrow('Invalid backend origin');
});

test('proxy requests use explicitly supplied headers and preserve query strings', async () => {
  const s = setup();
  await s.fetch('https://api.tramo.test/api/profile/me?view=full', {}, new Headers({ 'x-vercel-forwarded-for': '1.2.3.4' }));
  expect(s.headerReads()).toBe(0);
  expect(s.calls[0][1].headers.get('X-Tramo-Signature')).toBe(createHmac('sha256', Buffer.from(KEY, 'base64'))
    .update('1.2.3.4\nGET\n/api/profile/me?view=full').digest('hex'));
});

test('shared public caching stays independent of request headers and signature changes', async () => {
  const s = setup();
  const options = { cache: 'force-cache', next: { tags: ['site-content'], revalidate: 3600 } };
  await s.fetch('https://api.tramo.test/api/public/content/blog', options);
  await s.fetch('https://api.tramo.test/api/public/content/blog', options);
  expect(s.headerReads()).toBe(0);
  expect(s.calls[0][1].headers.get('X-Tramo-Client-IP')).toBe('127.0.0.1');
  expect(s.calls[0][1].headers.get('X-Tramo-Signature')).toBe(s.calls[1][1].headers.get('X-Tramo-Signature'));
  expect(s.calls[0][1].next).toBe(options.next);
});
