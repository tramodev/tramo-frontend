import { test } from 'node:test';
import assert from 'node:assert/strict';
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
    },
    console: { error: () => {} },
  });
  let hook;
  function select(itemId) {
    for (const cleanup of cleanups) cleanup?.();
    cleanups = [];
    refIndex = 0;
    hook = exports.useAutoSave({
      selectedItemId: itemId,
      onOptimisticUpdate: () => {},
      redirectToLogin: () => {},
    });
    hook.handleContentApplied(itemId);
  }
  return {
    requests, statuses, select,
    edit: (content) => hook.onChange({ read: (fn) => fn(), toJSON: () => content }),
    flush: () => { for (const [id, fn] of timers) { timers.delete(id); fn(); } },
    unload: (event) => beforeUnload(event),
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
  assert.equal(s.requests.length, 1);
  s.requests[0].resolve();
  await settle();
  assert.equal(s.requests.length, 2);
  assert.equal(s.requests[1].content, JSON.stringify('latest'));
  assert.notEqual(s.statuses.at(-1), 'saved');
  s.requests[1].resolve();
  await settle();
  assert.equal(s.statuses.at(-1), 'saved');
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
  assert.equal(warned, true);
  assert.equal(s.requests.length, 1);
  s.requests[0].resolve();
  await settle();
  assert.equal(s.requests[1].itemId, 'a');
  assert.equal(s.requests[1].content, JSON.stringify('latest a'));
  s.requests[1].resolve();
  await settle();
  assert.equal(s.requests[2].itemId, 'b');
  s.requests[2].resolve();
  await settle();
  assert.equal(s.statuses.at(-1), 'saved');
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
  assert.equal(s.requests.length, 1);
  assert.equal(s.statuses.at(-1), 'error');
  s.select('b');
  assert.equal(s.requests[1].content, JSON.stringify('new'));
  s.requests[1].resolve();
  await settle();
  assert.equal(s.statuses.at(-1), 'saved');
});
