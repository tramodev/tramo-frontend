import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const ORIGIN = 'https://private.r2.example';

function setup() {
  const timers = [], requests = [];
  let available = false;
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('components/editor/editor-images-provider.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, URL, Date, JSON, Math, Map, Set, Promise, AbortController,
    document: { visibilityState: 'visible' },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout() {},
    fetch: async (_url, init) => {
      requests.push(JSON.parse(init.body).imageIds);
      if (!available) return { ok: false };
      return { ok: true, json: async () => ({ images: [{ imageId: 'img', url: `${ORIGIN}/img`, expiresAt: new Date(Date.now() + 300_000).toISOString() }] }) };
    },
    require: name => ({ '@/lib/config': { R2_PRIVATE_ORIGIN: ORIGIN }, react: { createContext: () => ({ Provider: 'Provider' }) }, 'react/jsx-runtime': {} })[name] ?? {},
  });
  const store = new exports.ImageStore({ projectId: 'project' });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const tick = async () => { const timer = timers.shift(); timer.fn(); await flush(); return timer.ms; };
  return { store, timers, requests, tick, makeAvailable: () => { available = true; } };
}

test('an image that is not resolvable yet keeps retrying with a capped backoff instead of giving up', async () => {
  const s = setup();
  s.store.subscribe('img', () => {});
  const delays = [];
  for (let attempt = 0; attempt < 8; attempt++) delays.push(await s.tick());
  expect(delays.slice(1)).toEqual([1000, 2000, 4000, 8000, 15000, 15000, 15000]);
  expect(s.timers).toHaveLength(1);
  expect(s.requests).toHaveLength(8);
});

test('it reads as loading at first, as unavailable after repeated failures, and recovers when the image appears', async () => {
  const s = setup();
  const changes = [];
  s.store.subscribe('img', () => changes.push(s.store.get('img')));
  await s.tick();
  expect(s.store.failed('img')).toBe(false);
  await s.tick(); await s.tick();
  expect(s.store.failed('img')).toBe(true);
  s.makeAvailable();
  await s.tick();
  expect(s.store.get('img')).toBe(`${ORIGIN}/img`);
  expect(s.store.failed('img')).toBe(false);
  expect(changes.at(-1)).toBe(`${ORIGIN}/img`);
});
