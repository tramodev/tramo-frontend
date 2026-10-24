import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup() {
  const exports = {}, http = {}, requests = [];
  const transpile = path => ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(transpile('lib/http.ts'), { exports: http, Error });
  runInNewContext(transpile('lib/item-content-client.ts'), {
    exports, Error,
    require: () => http,
    fetch: (url, options) => new Promise(resolve => requests.push({ url, options, resolve })),
  });
  return { ...exports, requests };
}

test('reopening a project replaces the old bootstrap baseline with the latest content and epoch', async () => {
  const s = setup();
  s.acceptLoadedContents([{ id: 42, content: 'old', extractionEpoch: 0 }]);
  s.resetItemContents(['42']);
  s.acceptLoadedContents([{ id: 42, content: 'updated elsewhere', extractionEpoch: 1 }]);
  const saved = s.saveItemContent('42', 'new edit');
  expect(JSON.parse(s.requests[0].options.body)).toEqual({ content: 'new edit', expectedContent: 'updated elsewhere', extractionEpoch: 1 });
  s.requests[0].resolve(new Response(null, { status: 204 }));
  await saved;
});

test.each(['item', 'trail'])('reopening also refreshes the baseline of a lazily loaded %s', async kind => {
  const s = setup();
  s.acceptLoadedContents([{ id: 42, content: 'old', extractionEpoch: 0 }]);
  s.resetItemContents(['42']);
  const loaded = kind === 'item' ? s.getItemContent('42') : s.getTrailContents('trail');
  const row = { id: 42, content: 'fresh', extractionEpoch: 2 };
  s.requests[0].resolve(Response.json(kind === 'item' ? row : [row]));
  await loaded;
  const saved = s.saveItemContent('42', 'edited');
  expect(JSON.parse(s.requests[1].options.body)).toEqual({ content: 'edited', expectedContent: 'fresh', extractionEpoch: 2 });
  s.requests[1].resolve(new Response(null, { status: 204 }));
  await saved;
});

test.each(['item', 'trail'])('a late %s load cannot initialize a reopened project with old data', async kind => {
  const s = setup();
  const loaded = kind === 'item' ? s.getItemContent('42') : s.getTrailContents('trail');
  s.resetItemContents(['42']);
  const row = { id: 42, content: 'stale', extractionEpoch: 3 };
  s.requests[0].resolve(Response.json(kind === 'item' ? row : [row]));
  await loaded;
  expect(s.getExtractionEpoch('42')).toBe(0);
  s.acceptLoadedContents([{ id: 42, content: 'fresh', extractionEpoch: 4 }]);
  const saved = s.saveItemContent('42', 'edited');
  expect(JSON.parse(s.requests[1].options.body).expectedContent).toBe('fresh');
  s.requests[1].resolve(new Response(null, { status: 204 }));
  await saved;
});

test('a late save cannot overwrite a reopened note baseline', async () => {
  const s = setup();
  s.acceptLoadedContents([{ id: 42, content: 'old', extractionEpoch: 0 }]);
  const oldSave = s.saveItemContent('42', 'old edit');
  s.resetItemContents(['42']);
  s.acceptLoadedContents([{ id: 42, content: 'fresh', extractionEpoch: 1 }]);
  s.requests[0].resolve(new Response(null, { status: 204 }));
  await oldSave;
  const saved = s.saveItemContent('42', 'new edit');
  expect(JSON.parse(s.requests[1].options.body)).toEqual({ content: 'new edit', expectedContent: 'fresh', extractionEpoch: 1 });
  s.requests[1].resolve(new Response(null, { status: 204 }));
  await saved;
});

test('background reads in an active editor do not replace its confirmed baseline', async () => {
  const s = setup();
  s.acceptLoadedContents([{ id: 42, content: 'initial', extractionEpoch: 1 }]);
  const loaded = s.getItemContent('42');
  const saved = s.saveItemContent('42', 'saved edit');
  s.requests[1].resolve(new Response(null, { status: 204 }));
  await saved;
  s.requests[0].resolve(Response.json({ content: 'initial', extractionEpoch: 1 }));
  await loaded;
  s.acceptLoadedContents([{ id: 42, content: 'initial', extractionEpoch: 1 }]);
  const next = s.saveItemContent('42', 'next edit');
  expect(JSON.parse(s.requests[2].options.body).expectedContent).toBe('saved edit');
  s.requests[2].resolve(new Response(null, { status: 204 }));
  await next;
});

test('opening another project preserves confirmations needed by the previous save queue', async () => {
  const s = setup();
  s.acceptLoadedContents([{ id: 42, content: 'initial A', extractionEpoch: 0 }]);
  const first = s.saveItemContent('42', 'saved A1');
  s.resetItemContents(['99']);
  s.acceptLoadedContents([{ id: 99, content: 'project B', extractionEpoch: 0 }]);
  s.requests[0].resolve(new Response(null, { status: 204 }));
  await first;
  const second = s.saveItemContent('42', 'latest A2');
  expect(JSON.parse(s.requests[1].options.body).expectedContent).toBe('saved A1');
  s.requests[1].resolve(new Response(null, { status: 204 }));
  await second;
});

test.each(['item', 'trail'])('opening another project does not invalidate an unrelated %s load', async kind => {
  const s = setup();
  const loaded = kind === 'item' ? s.getItemContent('42') : s.getTrailContents('trail');
  s.resetItemContents(['99']);
  const row = { id: 42, content: 'project A', extractionEpoch: 2 };
  s.requests[0].resolve(Response.json(kind === 'item' ? row : [row]));
  await loaded;
  expect(s.getExtractionEpoch('42')).toBe(2);
});


test('reading a conflict snapshot validates it without replacing the active save baseline', async () => {
  const s = setup(); s.acceptExtractionEpoch('42', 0, 'local baseline');
  const reading = s.getItemContentSnapshot('42');
  s.requests[0].resolve(Response.json({ content: 'other tab', extractionEpoch: 2 }));
  expect(await reading).toEqual({ content: 'other tab', extractionEpoch: 2 });
  expect(s.getSavedItemContent('42')).toBe('local baseline');
  expect(s.getExtractionEpoch('42')).toBe(0);
});

test.each([{ content: 1 }, { content: 'text', extractionEpoch: -1 }, { content: 'text', extractionEpoch: '1' }])('invalid conflict snapshots are rejected: %j', response => {
  const s = setup(); const reading = s.getItemContentSnapshot('42');
  s.requests[0].resolve(Response.json(response));
  return expect(reading).rejects.toThrow('Invalid note content response');
});
