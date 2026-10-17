import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup() {
  const requests = []; const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('lib/project-history.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, encodeURIComponent, require: name => ({
    '@/lib/api': { authenticatedFetch: async (url, init) => { requests.push({ url, init }); return { ok: true, json: async () => ({ versions: [], nextCursor: null }) }; } },
    '@/lib/config': { API_BASE_URL: 'http://backend' },
    '@/lib/http': { parseResponse: async response => response.json() },
  })[name] });
  return { client: exports, requests };
}

test('history listing paginates privately without fetching documents', async () => {
  const { client, requests } = setup();
  await client.getProjectHistory('abc', 42);
  expect(requests).toHaveLength(1);
  expect(requests[0].url).toBe('http://backend/api/project/abc/history?beforeId=42');
  expect(requests[0].init.cache).toBe('no-store');
});

test('manual creation and restoration carry their original generation', async () => {
  const { client, requests } = setup();
  await client.createProjectVersion('abc', ' Milestone ', 3);
  await client.restoreProjectVersion('abc', 42, 3);
  expect(requests.map(request => request.init.headers['X-Project-Epoch'])).toEqual(['3', '3']);
  expect(JSON.parse(requests[0].init.body)).toEqual({ name: 'Milestone' });
  expect(requests[1].url).toBe('http://backend/api/project/abc/history/42/restore');
  expect(requests.every(request => request.init.method === 'POST')).toBe(true);
});
