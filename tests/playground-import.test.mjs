import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(path, modules, globals = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Response, Error, JSON, ...globals, require: name => modules[name] ?? {} });
  return exports;
}

function storage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key), map };
}

const utils = load('app/editor/editor-utils.ts', {});
const text = value => JSON.stringify({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: value }] }] } });
const playground = JSON.stringify({
  title: 'Playground',
  graphColors: null,
  structure: {
    version: 0, restoreEpoch: 0,
    items: [{ id: '1', title: 'Intro', titleAlign: 'left', unfiled: false, words: 0, characters: 0 }, { id: '3', title: 'Loose', titleAlign: 'center', unfiled: true, words: 0, characters: 0 }],
    trails: [{ id: '2', title: 'First', description: '', version: 0, itemIds: ['1'] }],
  },
  contents: { '1': text('hello') },
});

function client(fetch, localStorage) {
  let uuid = 0;
  return load('app/playground/playground-import.ts', { '@/app/editor/editor-utils': utils },
    { fetch, localStorage, crypto: { randomUUID: () => `uuid-${++uuid}` } });
}

test('import sends trails and items, keeps the request id across retries and clears the playground on success', async () => {
  const local = storage({ 'tramo:playground': playground });
  const requests = [];
  let fail = true;
  const importer = client(async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return fail ? Response.json({ message: 'Slow down' }, { status: 429 }) : Response.json({ projectId: 'abc', trailId: 7, itemId: 8 });
  }, local);

  await expect(importer.importPlayground(playground)).rejects.toThrow('Slow down');
  expect(local.getItem('tramo:playground')).toBe(playground);
  fail = false;
  await expect(importer.importPlayground(playground)).resolves.toEqual({ projectId: 'abc', trailId: 7, itemId: 8 });

  expect(requests[0].url).toBe('/api/projects/import');
  expect(requests[1].body.clientRequestId).toBe(requests[0].body.clientRequestId);
  expect(requests[0].body).toEqual({
    clientRequestId: 'uuid-1',
    title: 'Playground',
    trails: [{ title: 'First', itemIds: ['1'] }],
    items: [{ id: '1', title: 'Intro', titleAlign: 'left', content: text('hello') }, { id: '3', title: 'Loose', titleAlign: 'center', content: '' }],
  });
  expect(local.map.size).toBe(0);
  expect(importer.playgroundEditorHref({ projectId: 'abc', trailId: null, itemId: 8 })).toBe('/editor/abc?note=8&trail=&write=1');
});

test('only playgrounds with written text are offered for import', () => {
  const importer = client(() => { throw new Error('Must not send'); }, storage());
  expect(importer.hasPlaygroundContent(playground)).toBe(true);
  expect(importer.hasPlaygroundContent(JSON.stringify({ ...JSON.parse(playground), contents: { '1': text('   ') } }))).toBe(false);
  expect(importer.hasPlaygroundContent(JSON.stringify({ ...JSON.parse(playground), contents: { '1': '' } }))).toBe(false);
  expect(importer.hasPlaygroundContent('{broken')).toBe(false);
  expect(importer.hasPlaygroundContent(null)).toBe(false);
});

test('an empty playground is rejected before sending a request', async () => {
  const importer = client(() => { throw new Error('Must not send'); }, storage());
  const empty = JSON.stringify({ ...JSON.parse(playground), structure: { ...JSON.parse(playground).structure, items: [], trails: [] } });
  await expect(importer.importPlayground(empty)).rejects.toThrow('nothing in the playground');
});
