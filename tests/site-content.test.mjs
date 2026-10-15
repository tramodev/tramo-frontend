import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup({ admin = true, status = 200, networkError = false } = {}) {
  const exports = {};
  const publicCalls = [];
  const adminCalls = [];
  const invalidated = [];
  const response = { ok: status >= 200 && status < 300, status, json: async () => [] };
  const http = {};
  runInNewContext(ts.transpileModule(readFileSync('lib/http.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports: http });
  runInNewContext(ts.transpileModule(readFileSync('lib/site-content.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    fetch: async (...args) => { publicCalls.push(args); return response; },
    require: name => ({
      '@/lib/config': { API_BASE_URL: 'http://api.test' },
      '@/lib/http': http,
      '@/lib/session': { isAdmin: async () => admin },
      'next/navigation': { unstable_rethrow: () => {} },
      '@/lib/api': { authenticatedFetch: async (...args) => { adminCalls.push(args); if (networkError) throw new Error('offline'); return response; } },
      'next/cache': { updateTag: tag => invalidated.push(tag), revalidatePath: path => invalidated.push(path) },
    })[name] ?? {},
  });
  return { api: exports, publicCalls, adminCalls, invalidated };
}

test('public content shares tagged server caching without authentication', async () => {
  const { api, publicCalls, adminCalls } = setup();
  await api.getBlogPosts();
  await api.getBlogPost('first-post');
  await api.getChangelog();
  await api.getRoadmap();
  expect(publicCalls).toHaveLength(4);
  expect(adminCalls).toHaveLength(0);
  for (const [, options] of publicCalls) {
    expect(options.cache).toBe('force-cache');
    expect(options.next.tags).toEqual(['site-content']);
    expect(options.next.revalidate).toBe(3600);
    expect(options.headers).toBeUndefined();
  }
});

test('missing posts return null but backend failures are not turned into empty content', async () => {
  expect(await setup({ status: 404 }).api.getBlogPost('missing')).toBeNull();
  await expect(setup({ status: 500 }).api.getBlogPosts()).rejects.toThrow();
  await expect(setup({ status: 500 }).api.getBlogPost('first-post')).rejects.toThrow();
});

test.each(['blog', 'changelog', 'roadmap'])('saving %s invalidates public content only after a successful write', async kind => {
  const { api, adminCalls, invalidated } = setup();
  const form = new FormData();
  form.set('title', 'Title');
  form.set('content', 'Body');
  form.set('published', 'on');
  form.set('position', '2');
  const result = await api.saveSiteContent(kind, 4, form);
  expect(result.error).toBeNull();
  expect(adminCalls[0][0]).toBe(`http://api.test/api/admin/content/${kind}/4`);
  expect(adminCalls[0][1].method).toBe('PUT');
  const body = JSON.parse(adminCalls[0][1].body);
  expect(body.published).toBe(true);
  expect(kind === 'roadmap' ? body.description : body.content).toBe('Body');
  expect(invalidated).toEqual(['site-content', '/admin/content', '/sitemap.xml']);
});

test('creating and deleting content also expire cached pages', async () => {
  const state = setup();
  await state.api.saveSiteContent('blog', null, new FormData());
  expect(state.adminCalls[0][1].method).toBe('POST');
  await state.api.deleteSiteContent('blog', 4);
  expect(state.adminCalls[1][1].method).toBe('DELETE');
  expect(state.invalidated.filter(value => value === 'site-content')).toHaveLength(2);
});

test.each([400, 403, 409, 500])('failed writes (%s) do not invalidate cache', async status => {
  const state = setup({ status });
  expect((await state.api.saveSiteContent('blog', null, new FormData())).error).toBeTruthy();
  expect(state.invalidated).toHaveLength(0);
});

test('network failures preserve a retryable error without claiming success', async () => {
  const state = setup({ networkError: true });
  expect((await state.api.saveSiteContent('blog', null, new FormData())).error).toContain('not been confirmed');
  expect(state.invalidated).toHaveLength(0);
});

test('non-admins cannot read drafts or mutate content', async () => {
  const state = setup({ admin: false });
  await expect(state.api.getAdminContent()).rejects.toThrow('Access denied');
  expect((await state.api.saveSiteContent('blog', null, new FormData())).error).toBeTruthy();
  expect((await state.api.deleteSiteContent('blog', 4)).error).toBeTruthy();
  expect(state.adminCalls).toHaveLength(0);
});

test('invalid routes and IDs never reach the backend', async () => {
  const state = setup();
  for (const [kind, id] of [['../users', 1], ['blog', -1], ['blog', '4/../../users']]) {
    expect((await state.api.deleteSiteContent(kind, id)).error).toBeTruthy();
  }
  expect(state.adminCalls).toHaveLength(0);
});
