import { expect, test } from '@jest/globals';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const KEY = 'dGVzdC1iZmYtc2lnbmluZy1rZXktdGVzdC1iZmYta2V5';

function setup(env = {}, incoming = new Headers()) {
  const exports = {}, calls = [], responses = [];
  let headerReads = 0;
  let now = 1800000000000;
  const cache = new Map();
  const cacheOptions = [];
  runInNewContext(ts.transpileModule(readFileSync('lib/backend-fetch.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL, Headers, Buffer, Response, Date: { now: () => now },
    process: { env: { NODE_ENV: 'production', TRUSTED_IP_HEADER: 'x-real-ip', BFF_SIGNING_KEY: KEY, ...env } },
    require: name => ({
      'node:crypto': { createHmac },
      'node:net': { isIP },
      'next/cache': { unstable_cache: (fn, keys, options) => async () => {
        cacheOptions.push(options);
        const key = JSON.stringify(keys);
        if (!cache.has(key)) cache.set(key, await fn());
        return cache.get(key);
      } },
      'next/headers': { headers: async () => { headerReads++; return incoming; } },
      '@/lib/config': { API_BASE_URL: 'https://api.tramo.test' },
    })[name] ?? {},
    fetch: async (...args) => { calls.push(args); return responses.shift() ?? new Response('ok'); },
  });
  return { fetch: exports.backendFetch, calls, responses, headerReads: () => headerReads, cacheOptions, expire: () => cache.clear(), advance: () => { now += 120000; } };
}

test.each(['1.2.3.4', '2001:db8::1'])('signs the configured IP %s and ignores spoofed forwarding headers', async ip => {
  const s = setup({}, new Headers({ 'x-real-ip': ip, 'x-forwarded-for': '9.9.9.9' }));
  const signal = AbortSignal.timeout(1000);
  await s.fetch('https://api.tramo.test/api/auth/login', {
    method: 'POST', body: 'payload', cache: 'no-store', signal,
    headers: { Authorization: 'Bearer token', 'X-Tramo-Client-IP': 'forged', 'X-Tramo-Signature': 'forged' },
  });
  const [, options] = s.calls[0];
  expect(options.headers.get('X-Tramo-Client-IP')).toBe(ip);
  expect(options.headers.get('X-Tramo-Signature')).toBe(createHmac('sha256', Buffer.from(KEY, 'base64'))
    .update(`${ip}\n1800000000\nPOST\n/api/auth/login`).digest('hex'));
  expect(options.headers.get('X-Tramo-Timestamp')).toBe('1800000000');
  expect(options.headers.get('Authorization')).toBe('Bearer token');
  expect(options.body).toBe('payload');
  expect(options.signal).toBe(signal);
});

test('rejects requests without a trustworthy configured IP or a production signing key', async () => {
  for (const headers of [new Headers(), new Headers({ 'x-real-ip': '1.2.3.4, 5.6.7.8' })]) {
    const s = setup({}, headers);
    await expect(s.fetch('https://api.tramo.test/api/auth/login')).rejects.toThrow('Missing or invalid trusted client IP');
    expect(s.calls).toHaveLength(0);
  }
  await expect(setup({ TRUSTED_IP_HEADER: '' }).fetch('https://api.tramo.test/api/auth/login')).rejects.toThrow('TRUSTED_IP_HEADER');
  await expect(setup({ BFF_SIGNING_KEY: '' }).fetch('https://api.tramo.test/api/auth/login')).rejects.toThrow('BFF_SIGNING_KEY');
  await expect(setup({ BFF_SIGNING_KEY: 'c2hvcnQ=' }).fetch('https://api.tramo.test/api/auth/login')).rejects.toThrow('32 bytes');
  await expect(setup().fetch('https://external.test/api/auth/login')).rejects.toThrow('Invalid backend origin');
});

test('proxy requests use explicitly supplied headers and preserve query strings', async () => {
  const s = setup();
  await s.fetch('https://api.tramo.test/api/profile/me?view=full', {}, new Headers({ 'x-real-ip': '1.2.3.4' }));
  expect(s.headerReads()).toBe(0);
  expect(s.calls[0][1].headers.get('X-Tramo-Signature')).toBe(createHmac('sha256', Buffer.from(KEY, 'base64'))
    .update('1.2.3.4\n1800000000\nGET\n/api/profile/me?view=full').digest('hex'));
});

test('shared public caching stays independent of request headers and signature changes', async () => {
  const s = setup();
  const options = { cache: 'force-cache', next: { tags: ['site-content'], revalidate: 3600 } };
  await s.fetch('https://api.tramo.test/api/public/content/blog', options);
  s.advance();
  await s.fetch('https://api.tramo.test/api/public/content/blog', options);
  expect(s.headerReads()).toBe(0);
  expect(s.calls).toHaveLength(1);
  expect(s.calls[0][1].headers.get('X-Tramo-Client-IP')).toBe('public-cache');
  expect(s.calls[0][1].cache).toBe('no-store');
  expect(s.cacheOptions[0]).toBe(options.next);
  s.expire();
  await s.fetch('https://api.tramo.test/api/public/content/blog', options);
  expect(s.calls[1][1].headers.get('X-Tramo-Timestamp')).toBe('1800000120');
  expect(s.calls[1][1].headers.get('X-Tramo-Signature')).not.toBe(s.calls[0][1].headers.get('X-Tramo-Signature'));
  expect(s.headerReads()).toBe(0);
});


test('supports the Vercel header when explicitly configured', async () => {
  const s = setup({ TRUSTED_IP_HEADER: 'x-vercel-forwarded-for' }, new Headers({ 'x-vercel-forwarded-for': '1.2.3.4', 'x-real-ip': '9.9.9.9' }));
  await s.fetch('https://api.tramo.test/api/public/explore');
  expect(s.calls[0][1].headers.get('X-Tramo-Client-IP')).toBe('1.2.3.4');
});

test('shared caching cannot be used for private, authenticated or mutating requests', async () => {
  const s = setup();
  for (const [path, options] of [
    ['/api/profile/me', {}],
    ['/api/public/content/blog', { method: 'POST' }],
    ['/api/public/content/blog', { headers: { Authorization: 'Bearer token' } }],
  ]) {
    await expect(s.fetch(`https://api.tramo.test${path}`, { cache: 'force-cache', ...options })).rejects.toThrow('anonymous public GET');
  }
  expect(s.calls).toHaveLength(0);
});


test('backend failures are retried instead of being cached', async () => {
  const s = setup();
  s.responses.push(new Response('unavailable', { status: 503 }));
  const options = { cache: 'force-cache', next: { revalidate: 3600 } };
  await expect(s.fetch('https://api.tramo.test/api/public/content/blog', options)).rejects.toThrow('503');
  expect(await (await s.fetch('https://api.tramo.test/api/public/content/blog', options)).text()).toBe('ok');
  expect(s.calls).toHaveLength(2);
});
