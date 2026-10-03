import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup() {
  const refs = [];
  const timers = new Map();
  const requests = [];
  const statuses = [];
  let refIndex = 0;
  let timerId = 0;
  let cleanups = [];
  let beforeUnload;
  const exports = {};
  const source = readFileSync('app/editor/[projectId]/hooks/useAutoSave.ts', 'utf8');
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports,
    require: (name) => ({
      react: {
        useRef: (value) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
        useState: () => ['idle', (status) => statuses.push(status)],
        useCallback: (fn) => fn,
        useEffect: (fn) => { cleanups.push(fn()); },
      },
      '@/lib/item-content-client': {
        saveItemContent: (itemId, content) => new Promise((resolve, reject) => {
          requests.push({ itemId, content, resolve, reject });
        }),
      },
      '../../editor-utils': { isAuthError: () => false },
    })[name],
    setTimeout: (fn) => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: (id) => timers.delete(id),
    window: {
      addEventListener: (_, fn) => { beforeUnload = fn; },
      removeEventListener: () => {},
      dispatchEvent: () => {},
    },
    Event: class { constructor(type) { this.type = type; } },
    console: { error: () => {} },
  });
  let hook;
  let currentItemId;
  function select(itemId) {
    currentItemId = itemId;
    for (const cleanup of cleanups) cleanup?.();
    cleanups = [];
    refIndex = 0;
    hook = exports.useAutoSave({
      contextId: itemId,
      onOptimisticUpdate: () => {},
      redirectToLogin: () => {},
    });
  }
  return {
    requests, statuses, select,
    edit: (content) => hook.onChange(currentItemId, { read: (fn) => fn(), toJSON: () => content }),
    flush: () => { for (const [id, fn] of timers) { timers.delete(id); fn(); } },
    unload: (event) => beforeUnload(event),
    discard: (id) => hook.discardItem(id),
    editItem: (id, content) => hook.onChange(id, { read: (fn) => fn(), toJSON: () => content }),
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('saves serially and keeps only the latest pending content per item', async () => {
  const s = setup();
  s.select('a');
  s.edit('first');
  s.flush();
  s.edit('intermediate');
  s.flush();
  s.edit('latest');
  s.flush();
  expect(s.requests.length).toBe(1);
  s.requests[0].resolve();
  await settle();
  expect(s.requests.length).toBe(2);
  expect(s.requests[1].content).toBe(JSON.stringify('latest'));
  expect(s.statuses.at(-1)).not.toBe('saved');
  s.requests[1].resolve();
  await settle();
  expect(s.statuses.at(-1)).toBe('saved');
});

test('keeps pending changes across item switches and warns during unload', async () => {
  const s = setup();
  s.select('a');
  s.edit('first');
  s.flush();
  s.edit('latest a');
  s.select('b');
  s.edit('latest b');
  s.flush();
  let warned = false;
  s.unload({ preventDefault: () => { warned = true; } });
  expect(warned).toBe(true);
  expect(s.requests.length).toBe(1);
  s.requests[0].resolve();
  await settle();
  expect(s.requests[1].itemId).toBe('a');
  expect(s.requests[1].content).toBe(JSON.stringify('latest a'));
  s.requests[1].resolve();
  await settle();
  expect(s.requests[2].itemId).toBe('b');
  s.requests[2].resolve();
  await settle();
  expect(s.statuses.at(-1)).toBe('saved');
});

test('a failed save preserves newer content and does not retry in a loop', async () => {
  const s = setup();
  s.select('a');
  s.edit('old');
  s.flush();
  s.edit('new');
  s.flush();
  s.requests[0].reject(new Error('offline'));
  await settle();
  expect(s.requests.length).toBe(1);
  expect(s.statuses.at(-1)).toBe('error');
  s.select('b');
  expect(s.requests[1].content).toBe(JSON.stringify('new'));
  s.requests[1].resolve();
  await settle();
  expect(s.statuses.at(-1)).toBe('saved');
});


test('editing a non-visible item saves under its own id', async () => {
  const s = setup();
  s.select('visible');
  s.editItem('focused', 'text');
  s.flush();
  expect(s.requests[0].itemId).toBe('focused');
  s.requests[0].resolve();
  await settle();
});

test('deleted items never enqueue or restore pending writes', async () => {
  const s = setup();
  s.select('a');
  s.edit('text');
  s.flush();
  s.edit('pending');
  s.discard('a');
  s.requests[0].reject(new Error('deleted'));
  await settle();
  s.editItem('a', 'late');
  s.flush();
  expect(s.requests.length).toBe(1);
});


test('does not persist an incomplete image or a temporary preview', () => {
  const s = setup();
  s.select('a');
  s.edit({ root: { children: [{ type: 'image', version: 2, imageId: '' }] } });
  s.flush();
  expect(s.requests.length).toBe(0);
  s.edit({ root: { children: [{ type: 'image', version: 2, imageId: 'confirmed-id' }] } });
  s.flush();
  expect(s.requests.length).toBe(1);
  expect(s.requests[0].content).not.toContain('blob:');
});
