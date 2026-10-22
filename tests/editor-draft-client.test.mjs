import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const entities = { project: { title: ' Project ' }, trail: { title: '\u00a0' }, item: { title: ' Note ', titleAlign: 'left', content: '' } };
function load(path, modules, globals = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Request, Response, TextEncoder, Error, TypeError, AbortSignal, ...globals, require: name => modules[name] ?? {} });
  return exports;
}

test('draft client normalizes titles, retains HTTP status and honors Retry-After', async () => {
  const requests = [];
  const client = load('lib/editor-draft-client.ts', {}, { fetch: async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return Response.json({ message: 'Slow down' }, { status: 429, headers: { 'Retry-After': '4' } });
  } });
  let error;
  try { await client.commitEditorDraft('uuid', entities); } catch (failure) { error = failure; }
  expect(error.status).toBe(429);
  expect(error.retryable).toBe(true);
  expect(error.retryAfter).toBe(4000);
  expect(requests[0].url).toBe('/api/projects/draft-commit');
  expect(requests[0].body.project.title).toBe('Project');
  expect(requests[0].body.trail.title).toBe('');
  expect(requests[0].body.item.title).toBe('Note');
});

test('oversized UTF-8 note content is rejected before sending a request', async () => {
  const client = load('lib/editor-draft-client.ts', {}, { fetch: () => { throw new Error('Must not send'); } });
  await expect(client.commitEditorDraft('uuid', { ...entities, item: { ...entities.item, content: 'é'.repeat(600000) } })).rejects.toMatchObject({ status: 413 });
});

test('timeouts are retryable and the commit request has a timeout signal', async () => {
  const client = load('lib/editor-draft-client.ts', {}, { fetch: async (_url, options) => {
    expect(options.signal).toBeDefined();
    const error = new Error('Timed out'); error.name = 'TimeoutError'; throw error;
  } });
  await expect(client.commitEditorDraft('uuid', entities)).rejects.toMatchObject({ status: 408, retryable: true });
});

test('server actions preserve metadata HTTP failures without exposing credentials', async () => {
  const requests = [];
  const store = load('lib/projects-store.ts', {
    './api': { authenticatedFetch: async (...args) => {
      requests.push(args); return Response.json({ message: 'Quota exceeded' }, { status: 403 });
    } },
    './config': { API_BASE_URL: 'https://backend' },
    '@/lib/project-validation': { PROJECT_TEXT_MAX_LENGTH: 255 },
  });
  await expect(store.saveDraftMetadata('project', 'item', '12', { title: 'Note' }, 0)).resolves.toMatchObject({ status: 403, message: 'Quota exceeded' });
  expect(requests[0][0]).toBe('https://backend/api/item/12');
  expect(requests[0][1].headers['X-Project-Id']).toBe('project');
  expect(requests[0][1].headers['X-Project-Epoch']).toBe('0');
  const count = requests.length;
  expect((await store.saveDraftMetadata('project', 'item', 'temporary', { title: 'Note' }, 0)).status).toBe(400);
  expect(requests).toHaveLength(count);
});

test('draft route forwards the body and retry status through authenticated fetch', async () => {
  const requests = [];
  const route = load('app/api/projects/draft-commit/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/config': { API_BASE_URL: 'https://backend' },
    '@/lib/request-body': { readRequestBody: request => request.text() },
    '@/lib/api': { authenticatedFetch: async (...args) => {
      requests.push(args);
      return Response.json({ message: 'Slow down' }, { status: 429, headers: { 'Retry-After': '4' } });
    } },
  });
  const body = JSON.stringify({ clientRequestId: 'uuid', ...entities });
  const response = await route.POST(new Request('https://frontend/api/projects/draft-commit', { method: 'POST', body }));
  expect(requests[0][0]).toBe('https://backend/api/project/draft-commit');
  expect(requests[0][1].body).toBe(body);
  expect(response.status).toBe(429);
  expect(response.headers.get('Retry-After')).toBe('4');
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
