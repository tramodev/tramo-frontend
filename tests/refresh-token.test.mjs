import { expect, test } from '@jest/globals';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup() {
  const context = new AsyncLocalStorage();
  const exports = {};
  const requests = [];
  const accessTokens = [];
  const stores = [new Map([['refreshToken', 'old']]), new Map([['refreshToken', 'old']])];
  runInNewContext(ts.transpileModule(readFileSync('lib/auth.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports,
    require: (name) => ({
      'next/headers': {
        cookies: async () => {
          const store = context.getStore();
          return {
            get: (key) => store.has(key) ? { value: store.get(key) } : undefined,
            set: (key, value) => store.set(key, value),
          };
        },
      },
      './config': { API_BASE_URL: 'http://backend', REFRESH_TOKEN_MAX_AGE: 2592000 },
    })[name],
    fetch: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
    process: { env: { NODE_ENV: 'test' } },
    console: { error: () => {} },
  });
  const api = {};
  runInNewContext(ts.transpileModule(readFileSync('lib/api.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports: api,
    require: (name) => ({ './auth': exports, 'next/navigation': {} })[name],
    fetch: async (_, options) => {
      const token = options.headers.Authorization;
      accessTokens.push(token);
      return new Response(null, { status: token === 'Bearer new-access' ? 200 : 401 });
    },
  });
  return {
    requests, stores, accessTokens,
    refresh: (index) => context.run(stores[index], () => exports.refreshAccessToken()),
    fetch: (index) => context.run(stores[index], () => api.authenticatedFetch('http://backend/api/profile/me')),
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('concurrent requests share refresh but each updates its own cookies', async () => {
  const s = setup();
  const first = s.refresh(0);
  const second = s.refresh(1);
  await settle();
  expect(s.requests.length).toBe(1);
  s.requests[0].resolve(new Response(JSON.stringify({
    accessToken: 'new-access', refreshToken: 'new-refresh', username: 'user',
  })));
  expect(await Promise.all([first, second])).toStrictEqual([true, true]);
  for (const store of s.stores) {
    expect(store.get('accessToken')).toBe('new-access');
    expect(store.get('refreshToken')).toBe('new-refresh');
  }
});

test('both authenticated requests retry with the new access token', async () => {
  const s = setup();
  const first = s.fetch(0);
  const second = s.fetch(1);
  await settle();
  expect(s.requests.length).toBe(1);
  s.requests[0].resolve(new Response(JSON.stringify({
    accessToken: 'new-access', refreshToken: 'new-refresh',
  })));
  const responses = await Promise.all([first, second]);
  expect(responses.map((response) => response.status)).toStrictEqual([200, 200]);
  expect(s.accessTokens.filter((token) => token === 'Bearer new-access').length).toBe(2);
});

test('a failed shared refresh preserves cookies and allows a new attempt', async () => {
  const s = setup();
  const first = s.refresh(0);
  const second = s.refresh(1);
  await settle();
  s.requests[0].resolve(new Response(null, { status: 401 }));
  expect(await Promise.all([first, second])).toStrictEqual([false, false]);
  for (const store of s.stores) expect(store.get('refreshToken')).toBe('old');
  const retry = s.refresh(0);
  await settle();
  expect(s.requests.length).toBe(2);
  s.requests[1].resolve(new Response(JSON.stringify({
    accessToken: 'new-access', refreshToken: 'new-refresh',
  })));
  expect(await retry).toBe(true);
});
