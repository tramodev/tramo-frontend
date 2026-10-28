import { expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { NextRequest, NextResponse } from 'next/server.js';
import ts from 'typescript';

function setup(state = 'browser-state', response = new Response(null, { status: 302, headers: { Location: 'http://frontend/settings?tab=plan&patreon=connected' } })) {
  const exports = {};
  const cookieStore = { get: () => state ? { value: state } : undefined, set: jest.fn() };
  const authenticatedFetch = jest.fn(async () => response);
  runInNewContext(ts.transpileModule(readFileSync('app/api/auth/patreon/callback/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL, URLSearchParams,
    require: name => ({
      'next/headers': { cookies: async () => cookieStore },
      'next/server': { NextResponse },
      '@/lib/api': { authenticatedFetch },
      '@/lib/config': { API_BASE_URL: 'http://backend' },
    })[name],
  });
  return { cookieStore, authenticatedFetch, run: query => exports.GET(new NextRequest(`http://frontend/api/auth/patreon/callback?${query}`)) };
}

test.each([undefined, '', 'browser-state'])('a missing or foreign state (%s) never completes authorization', async state => {
  const s = setup(state ?? 'browser-state');
  const response = await s.run(`code=code${state === undefined ? '' : '&state=attacker-state'}`);
  expect(response.headers.get('location')).toBe('http://frontend/settings?tab=plan&patreon=error');
  expect(s.authenticatedFetch).not.toHaveBeenCalled();
  expect(s.cookieStore.set).not.toHaveBeenCalled();
});

test('a matching browser state is consumed and completed using the session', async () => {
  const s = setup();
  const response = await s.run('code=code&state=browser-state');
  expect(s.cookieStore.set).toHaveBeenCalledWith('patreonState', '', { maxAge: 0, path: '/api/auth/patreon/callback' });
  expect(s.authenticatedFetch).toHaveBeenCalledWith('http://backend/api/auth/patreon/complete?state=browser-state&code=code', { redirect: 'manual' });
  expect(response.headers.get('location')).toBe('http://frontend/settings?tab=plan&patreon=connected');
});

test.each(['http://evil.test/settings', 'http://frontend/api/auth/patreon/callback', 'https://www.patreon.com/evil'])('unexpected callback redirects are rejected: %s', async location => {
  const s = setup('browser-state', new Response(null, { status: 302, headers: { Location: location } }));
  expect((await s.run('code=code&state=browser-state')).headers.get('location')).toContain('patreon=error');
});

test.each([401, 403, 500])('a backend rejection (%s) cannot complete authorization', async status => {
  const s = setup('browser-state', new Response(null, { status }));
  expect((await s.run('code=code&state=browser-state')).headers.get('location')).toContain('patreon=error');
});

test('a denied authorization consumes the matching state without contacting the backend', async () => {
  const s = setup();
  await s.run('state=browser-state&error=access_denied');
  expect(s.cookieStore.set).toHaveBeenCalled();
  expect(s.authenticatedFetch).not.toHaveBeenCalled();
});

test('the authorization action binds the returned state to an httpOnly browser cookie', async () => {
  const exports = {};
  const cookieStore = { set: jest.fn() };
  runInNewContext(ts.transpileModule(readFileSync('lib/patreon.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL, process: { env: { NODE_ENV: 'production' } },
    require: name => ({
      'next/headers': { cookies: async () => cookieStore },
      '@/lib/api': { authenticatedFetch: async () => new Response() },
      '@/lib/config': { API_BASE_URL: 'http://backend' },
      '@/lib/http': { parseResponse: async () => ({ authorizeUrl: 'https://www.patreon.com/oauth2/authorize?state=random-state' }) },
    })[name],
  });
  await exports.getPatreonAuthorizeUrl();
  expect(cookieStore.set).toHaveBeenCalledWith('patreonState', 'random-state', {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 900, path: '/api/auth/patreon/callback',
  });
});
