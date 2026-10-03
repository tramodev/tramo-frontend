import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { NextRequest, NextResponse } from 'next/server.js';
import ts from 'typescript';

const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900, role: 'USER' })).toString('base64url')}.signature`;

function setup(responses) {
  const exports = {};
  const requests = [];
  runInNewContext(ts.transpileModule(readFileSync('proxy.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports,
    require: (name) => ({
      'next/server': { NextResponse },
      '@/lib/config': { API_BASE_URL: 'http://backend', REFRESH_TOKEN_MAX_AGE: 2592000 },
    })[name],
    fetch: async (url, options) => {
      requests.push({ url, options });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      if (!response) throw new Error('Unexpected fetch');
      return response;
    },
    atob, URL, Date,
    process: { env: { NODE_ENV: 'test' } },
  });
  return {
    requests,
    run: (path, cookie = `accessToken=${token}; refreshToken=removed; username=old`, action = false) => exports.proxy(new NextRequest(`http://frontend${path}`, {
      headers: { cookie, ...(action ? { 'next-action': 'action-id' } : {}) },
    })),
  };
}

const failedRefresh = () => new Response(null, { status: 401 });

test.each(['/projects', '/editor/deleted', '/profile', '/settings'])('a deleted user cannot open %s with an unexpired cookie', async (path) => {
  const s = setup([new Response(null, { status: 404 }), failedRefresh()]);
  const response = await s.run(path);
  expect(response.headers.get('location')).toBe('http://frontend/login');
  for (const name of ['accessToken', 'refreshToken', 'username']) expect(response.cookies.get(name)?.value).toBe('');
  expect(s.requests[0].options.cache).toBe('no-store');
});

test('stale cookies do not redirect login back to projects', async () => {
  const s = setup([new Response(null, { status: 404 }), failedRefresh()]);
  const response = await s.run('/login');
  expect(response.headers.get('location')).toBeNull();
  expect(response.cookies.get('accessToken')?.value).toBe('');
  expect(response.cookies.get('refreshToken')?.value).toBe('');
});

test('a valid profile can open projects', async () => {
  const s = setup([new Response('{}')]);
  const response = await s.run('/projects');
  expect(response.headers.get('location')).toBeNull();
  expect(response.cookies.get('accessToken')).toBeUndefined();
});

test('a deleted session cannot call a protected server action', async () => {
  const s = setup([new Response(null, { status: 404 }), failedRefresh()]);
  const response = await s.run('/projects', undefined, true);
  expect(response.headers.get('location')).toBe('http://frontend/login');
});

test('an anonymous request redirects without querying the backend', async () => {
  const s = setup([]);
  expect((await s.run('/projects', '')).headers.get('location')).toBe('http://frontend/login');
  expect(s.requests).toHaveLength(0);
});

test('a backend outage blocks private pages without deleting the session', async () => {
  const s = setup([new Response(null, { status: 500 })]);
  const response = await s.run('/projects');
  expect(response.status).toBe(503);
  expect(response.cookies.get('accessToken')).toBeUndefined();
});

test('a valid refresh updates the request and browser cookies', async () => {
  const s = setup([new Response(null, { status: 401 }), new Response(JSON.stringify({ accessToken: token, refreshToken: 'rotated' }))]);
  const response = await s.run('/projects');
  expect(response.headers.get('location')).toBeNull();
  expect(response.cookies.get('refreshToken')?.value).toBe('rotated');
});

test('the birth date gate still leads to onboarding', async () => {
  const pendingToken = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900, role: 'USER', requiresBirthDate: true })).toString('base64url')}.signature`;
  const s = setup([new Response(JSON.stringify({ message: 'Please provide your birth date to continue.' }), { status: 403 })]);
  expect((await s.run('/projects', `accessToken=${pendingToken}`)).headers.get('location')).toBe('http://frontend/onboarding/birth-date');
});

test('a login redirect retains cookies rotated by refresh', async () => {
  const s = setup([new Response(null, { status: 401 }), new Response(JSON.stringify({ accessToken: token, refreshToken: 'rotated' }))]);
  const response = await s.run('/login');
  expect(response.headers.get('location')).toBe('http://frontend/projects');
  expect(response.cookies.get('refreshToken')?.value).toBe('rotated');
});
