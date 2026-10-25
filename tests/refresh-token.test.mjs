// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { expect, test } from '@jest/globals';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { NextRequest, NextResponse } from 'next/server.js';
import ts from 'typescript';

function setup() {
  const context = new AsyncLocalStorage();
  const exports = {};
  const requests = [];
  const accessTokens = [];
  const expirations = [];
  const timeouts = [];
  const refreshModule = {};
  const stores = [new Map([['refreshToken', 'old']]), new Map([['refreshToken', 'old']])];
  const refreshRuntime = {
    require: () => ({ API_BASE_URL: 'http://backend', backendFetch: (...args) => refreshRuntime.fetch(...args) }),
    fetch: (url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      requests.push({ url, options, resolve, reject });
    }),
    setTimeout: (callback) => { expirations.push(callback); return { unref() {} }; },
    AbortSignal: { timeout: (ms) => {
      const controller = new AbortController();
      timeouts.push({ ms, abort: () => controller.abort(new Error('timed out')) });
      return controller.signal;
    } },
    globalThis: {},
  };
  const loadRefresh = () => {
    const loaded = {};
    runInNewContext(ts.transpileModule(readFileSync('lib/refresh.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
    }).outputText, { ...refreshRuntime, exports: loaded });
    return loaded;
  };
  Object.assign(refreshModule, loadRefresh());
  runInNewContext(ts.transpileModule(readFileSync('lib/auth.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports,
    require: (name) => ({
      '@/lib/backend-fetch': { backendFetch: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) },
      'next/headers': {
        cookies: async () => {
          const store = context.getStore();
          return {
            get: (key) => store.has(key) ? { value: store.get(key) } : undefined,
            set: (key, value) => store.set(key, value),
            delete: (key) => store.delete(key),
          };
        },
      },
      './config': { API_BASE_URL: 'http://backend', REFRESH_TOKEN_MAX_AGE: 2592000 },
      '@/lib/refresh': refreshModule,
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
    Response,
    require: (name) => ({ './auth': exports, 'next/navigation': {}, '@/lib/backend-fetch': { backendFetch: async (_, options) => {
      const token = options.headers.Authorization;
      accessTokens.push(token);
      return new Response(null, { status: token === 'Bearer new-access' ? 200 : 401 });
    } } })[name],
    fetch: async (_, options) => {
      const token = options.headers.Authorization;
      accessTokens.push(token);
      return new Response(null, { status: token === 'Bearer new-access' ? 200 : 401 });
    },
  });
  const proxyModule = {};
  const proxyRefresh = loadRefresh();
  runInNewContext(ts.transpileModule(readFileSync('proxy.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports: proxyModule,
    require: (name) => ({
      '@/lib/backend-fetch': { backendFetch: (...args) => refreshRuntime.fetch(...args) },
      'next/server': { NextResponse },
      '@/lib/config': { API_BASE_URL: 'http://backend', REFRESH_TOKEN_MAX_AGE: 2592000 },
      '@/lib/refresh': proxyRefresh,
    })[name],
    atob, URL, Date,
    process: { env: { NODE_ENV: 'test' } },
  });
  return {
    requests, stores, accessTokens, expirations, timeouts,
    refresh: (index) => context.run(stores[index], () => exports.refreshAccessToken()),
    logout: (index) => context.run(stores[index], () => exports.logout()),
    invalidate: refreshModule.invalidateRefreshTokens,
    fetch: (index) => context.run(stores[index], () => api.authenticatedFetch('http://backend/api/profile/me')),
    proxy: (refreshToken = 'old') => proxyModule.proxy(new NextRequest('http://frontend/projects', {
      headers: { cookie: `refreshToken=${refreshToken}` },
    })),
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

test.each([503, 429, 'network', 'timeout'])('an unavailable refresh (%s) returns 503 instead of a false authentication failure', async failure => {
  const s = setup();
  const first = s.fetch(0);
  await settle();
  if (failure === 'network') s.requests[0].reject(new Error('offline'));
  else if (failure === 'timeout') s.timeouts[0].abort();
  else s.requests[0].resolve(new Response(null, { status: failure }));
  const response = await first;
  expect(response.status).toBe(503);
  expect(s.stores[0].get('refreshToken')).toBe('old');
  const retry = s.fetch(0);
  await settle();
  s.requests[1].resolve(Response.json({ accessToken: 'new-access', refreshToken: 'new-refresh' }));
  expect((await retry).status).toBe(200);
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

test('proxy and server actions share refresh across module copies', async () => {
  const s = setup();
  const proxy = s.proxy();
  const action = s.refresh(0);
  await settle();
  expect(s.requests).toHaveLength(1);
  expect(s.requests[0].options.cache).toBe('no-store');
  s.requests[0].resolve(new Response(JSON.stringify({
    accessToken: 'new-access', refreshToken: 'new-refresh',
  })));
  const response = await proxy;
  expect(await action).toBe(true);
  expect(response.cookies.get('refreshToken')?.value).toBe('new-refresh');
  expect(s.stores[0].get('refreshToken')).toBe('new-refresh');
});

test('late requests with the old cookie reuse the completed refresh briefly', async () => {
  const s = setup();
  const first = s.refresh(0);
  await settle();
  s.requests[0].resolve(new Response(JSON.stringify({
    accessToken: 'new-access', refreshToken: 'new-refresh',
  })));
  expect(await first).toBe(true);
  expect((await s.proxy()).cookies.get('refreshToken')?.value).toBe('new-refresh');
  expect(s.requests).toHaveLength(1);
  s.expirations[0]();
  const afterExpiry = s.proxy();
  await settle();
  expect(s.requests).toHaveLength(2);
  s.requests[1].resolve(new Response(null, { status: 401 }));
  expect((await afterExpiry).headers.get('location')).toBe('http://frontend/login');
});

test('different refresh tokens do not share sessions', async () => {
  const s = setup();
  const first = s.proxy('first');
  const second = s.proxy('second');
  await settle();
  expect(s.requests).toHaveLength(2);
  for (const [index, name] of ['first', 'second'].entries()) {
    s.requests[index].resolve(new Response(JSON.stringify({
      accessToken: `${name}-access`, refreshToken: `${name}-refresh`,
    })));
  }
  expect((await first).cookies.get('refreshToken')?.value).toBe('first-refresh');
  expect((await second).cookies.get('refreshToken')?.value).toBe('second-refresh');
});

test.each([null, {}, { accessToken: 'new-access' }, { accessToken: 'new-access', refreshToken: 42 }])(
  'a malformed refresh response does not overwrite cookies: %j', async (body) => {
    const s = setup();
    const action = s.refresh(0);
    await settle();
    s.requests[0].resolve(new Response(JSON.stringify(body)));
    expect(await action).toBe('unavailable');
    expect(s.stores[0].get('refreshToken')).toBe('old');
  },
);

test('a network failure does not leave a rejected refresh cached', async () => {
  const s = setup();
  const first = s.refresh(0);
  await settle();
  s.requests[0].reject(new Error('offline'));
  expect(await first).toBe('unavailable');
  const retry = s.refresh(0);
  await settle();
  expect(s.requests).toHaveLength(2);
  s.requests[1].resolve(new Response(null, { status: 401 }));
  expect(await retry).toBe(false);
});

test('logout invalidates the cached original and its replacement', async () => {
  const s = setup();
  const action = s.refresh(0);
  await settle();
  s.requests[0].resolve(new Response(JSON.stringify({
    accessToken: 'new-access', refreshToken: 'new-refresh',
  })));
  expect(await action).toBe(true);
  const logout = s.logout(0);
  await settle();
  s.requests[1].resolve(new Response());
  await logout;
  expect(s.stores[0].has('refreshToken')).toBe(false);
  const staleRequest = s.proxy();
  await settle();
  expect(s.requests).toHaveLength(3);
  s.requests[2].resolve(new Response(null, { status: 401 }));
  expect((await staleRequest).headers.get('location')).toBe('http://frontend/login');
});

test('logout discards a refresh that was already pending', async () => {
  const s = setup();
  const action = s.refresh(0);
  await settle();
  const logout = s.logout(0);
  await settle();
  s.requests[0].resolve(new Response(JSON.stringify({
    accessToken: 'new-access', refreshToken: 'new-refresh',
  })));
  expect(await action).toBe(false);
  expect(s.stores[0].has('accessToken')).toBe(false);
  s.requests[1].resolve(new Response());
  await logout;
  expect(s.stores[0].has('refreshToken')).toBe(false);
});

test('an access token rejected by the backend is not reused from cache', async () => {
  const s = setup();
  const action = s.refresh(0);
  await settle();
  s.requests[0].resolve(new Response(JSON.stringify({
    accessToken: 'new-access', refreshToken: 'new-refresh',
  })));
  expect(await action).toBe(true);
  s.stores[1].set('accessToken', 'new-access');
  const rejected = s.refresh(1);
  await settle();
  expect(s.requests).toHaveLength(2);
  s.requests[1].resolve(new Response(null, { status: 401 }));
  expect(await rejected).toBe(false);
  expect(s.stores[1].get('refreshToken')).toBe('old');
});

test('an old expiration cannot remove a newer refresh for the same token', async () => {
  const s = setup();
  const action = s.refresh(0);
  await settle();
  s.requests[0].resolve(new Response(JSON.stringify({
    accessToken: 'new-access', refreshToken: 'new-refresh',
  })));
  expect(await action).toBe(true);
  s.invalidate('old');
  const first = s.proxy();
  await settle();
  s.expirations[0]();
  const second = s.proxy();
  await settle();
  expect(s.requests).toHaveLength(2);
  s.requests[1].resolve(new Response(JSON.stringify({
    accessToken: 'other-access', refreshToken: 'other-refresh',
  })));
  for (const response of await Promise.all([first, second])) {
    expect(response.cookies.get('refreshToken')?.value).toBe('other-refresh');
  }
});

test('a hanging refresh times out and releases all callers and its cache entry', async () => {
  const s = setup();
  const first = s.refresh(0);
  const second = s.refresh(1);
  await settle();
  expect(s.requests).toHaveLength(1);
  expect(s.timeouts[0].ms).toBe(10000);
  s.timeouts[0].abort();
  expect(await Promise.all([first, second])).toStrictEqual(['unavailable', 'unavailable']);
  const retry = s.refresh(0);
  await settle();
  expect(s.requests).toHaveLength(2);
  s.requests[1].resolve(new Response(null, { status: 401 }));
  expect(await retry).toBe(false);
});

test('a proxy refresh timeout returns 503 without deleting the session and allows retry', async () => {
  const s = setup();
  const first = s.proxy();
  await settle();
  s.timeouts[0].abort();
  const response = await first;
  expect(response.status).toBe(503);
  expect(response.headers.get('location')).toBeNull();
  expect(response.cookies.get('refreshToken')).toBeUndefined();
  const retry = s.proxy();
  await settle();
  expect(s.requests).toHaveLength(2);
  s.requests[1].resolve(new Response(JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh' })));
  expect((await retry).cookies.get('refreshToken')?.value).toBe('new-refresh');
});
