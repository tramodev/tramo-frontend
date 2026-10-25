import { expect, test } from '@jest/globals';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { NextRequest, NextResponse } from 'next/server.js';
import ts from 'typescript';

function load(path, modules = {}, env = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, process: { env }, require: name => modules[name] ?? {}, atob, URL, crypto: { randomUUID } });
  return exports;
}

const csp = load('lib/csp.ts', {}, { NODE_ENV: 'production', NEXT_PUBLIC_R2_PUBLIC_BASE_URL: 'https://public.example/bucket', NEXT_PUBLIC_R2_PRIVATE_ORIGIN: 'https://private.example' });
const proxy = load('proxy.ts', {
  'node:crypto': { randomBytes }, '@/lib/csp': csp, 'next/server': { NextResponse },
});

test('production only allows nonce-authorized scripts, blocks inline handlers and objects, and retains embed and image restrictions', () => {
  const policy = csp.contentSecurityPolicy('random-nonce');
  const scripts = policy.split('; ').find(rule => rule.startsWith('script-src '));
  expect(scripts).toContain("'nonce-random-nonce' 'strict-dynamic'");
  expect(scripts).not.toMatch(/unsafe-inline|unsafe-eval/);
  expect(policy).toContain("script-src-attr 'none'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain('https://public.example https://private.example');
  expect(policy).toContain('https://www.youtube-nocookie.com https://platform.twitter.com');
});

test('development retains eval for Next debugging without allowing arbitrary inline scripts', () => {
  const policy = load('lib/csp.ts', {}, { NODE_ENV: 'development' }).contentSecurityPolicy('dev-nonce');
  const scripts = policy.split('; ').find(rule => rule.startsWith('script-src '));
  expect(scripts).toContain("'unsafe-eval'");
  expect(scripts).not.toContain("'unsafe-inline'");
});

test('every HTML request gets a fresh nonce, overwrites spoofed headers and cannot be cached as shared HTML', async () => {
  const values = [];
  for (const path of ['/about', '/login', '/p/project', '/wiki/notes', '/editor/project']) {
    const request = new NextRequest(`http://frontend${path}`, { headers: { 'x-nonce': 'forged', 'Content-Security-Policy': "script-src 'unsafe-inline'" } });
    const response = await proxy.proxy(request);
    const policy = response.headers.get('Content-Security-Policy');
    const nonce = request.headers.get('x-nonce');
    expect(nonce).not.toBe('forged');
    expect(Buffer.from(nonce, 'base64')).toHaveLength(16);
    expect(policy).toContain(`'nonce-${nonce}'`);
    expect(request.headers.get('Content-Security-Policy')).toBe(policy);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    values.push(nonce);
  }
  expect(new Set(values).size).toBe(values.length);
});

test('the proxy protects HTML routes and leaves API, bundled assets and generated images outside the nonce policy', () => {
  const matcher = new RegExp(`^${proxy.config.matcher[0]}$`);
  for (const path of ['/login', '/signup', '/p/project', '/editor/project', '/u/user', '/blog/post', '/wiki/notes']) {
    expect(matcher.test(path)).toBe(true);
  }
  for (const path of ['/api/auth/login', '/_next/static/chunk.js', '/favicon.ico', '/icon.svg', '/opengraph-image', '/gif.worker.js']) {
    expect(matcher.test(path)).toBe(false);
  }
});
