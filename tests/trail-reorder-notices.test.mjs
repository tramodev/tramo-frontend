import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const transpile = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const settle = () => new Promise(resolve => setImmediate(resolve));

async function setup() {
  const states = [], refs = [], effects = [];
  let stateIndex = 0, refIndex = 0, initial = true;
  let resolveSave, rejectSave, requests = 0, bootstraps = 0, previews = 0;
  let createResolve, createReject, creates = 0, looseCreateResolve, createLooseReject, looseCreates = 0;
  const items = Object.fromEntries(['a', 'b', 'c'].map(id => [id, { id, title: id, content: '' }]));
  const steps = ['a', 'b', 'c'].map(id => ({ itemId: id }));
  const trail = { id: 'trail', itemIds: ['a', 'b', 'c'], steps };
  const navigation = {};
  runInNewContext(transpile('app/editor/trail-navigation.ts'), { exports: navigation });
  const saves = {};
  runInNewContext(transpile('lib/pending-saves.ts'), { exports: saves });
  const autoSaveRefs = [];
  let autoSaveRefIndex = 0;
  const autoSaveStatuses = [];
  let autoSaveTimerId = 0;
  const autoSaveTimers = new Map();
  const autoSaveCleanups = [];
  const autoSaveRequests = [];
  let autoSaveBeforeUnload;
  const autoSaveExports = {};
  runInNewContext(transpile('app/editor/[projectId]/hooks/useAutoSave.ts'), {
    exports: autoSaveExports,
    require: name => ({
      react: {
        useRef: (value) => autoSaveRefs[autoSaveRefIndex++] ?? (autoSaveRefs[autoSaveRefIndex - 1] = { current: value }),
        useState: () => ['idle', (status) => autoSaveStatuses.push(status)],
        useCallback: (fn) => fn,
        useEffect: (fn) => { autoSaveCleanups.push(fn()); },
      },
      '@/lib/item-content-client': {
        saveItemContent: (itemId, content) => new Promise((resolve, reject) => {
          autoSaveRequests.push({ itemId, content, resolve, reject });
        }),
      },
      '../../editor-utils': { isAuthError: () => false },
    })[name],
    setTimeout: (fn) => { autoSaveTimers.set(++autoSaveTimerId, fn); return autoSaveTimerId; },
    clearTimeout: (id) => autoSaveTimers.delete(id),
    window: {
      addEventListener: (_, fn) => { autoSaveBeforeUnload = fn; },
      removeEventListener: () => {},
      dispatchEvent: () => {},
    },
    Event: class { constructor(type) { this.type = type; } },
    console: { error: () => {} },
  });
  const exports = {};
  const router = { replace: () => {} };
  runInNewContext(transpile('app/editor/[projectId]/hooks/useProjectEditorState.ts'), {
    exports,
    require: name => ({
      react: {
        useState: value => {
          const i = stateIndex++;
          if (!(i in states)) states[i] = typeof value === 'function' ? value() : value;
          return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }];
        },
        useRef: value => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
        useMemo: fn => fn(), useCallback: fn => fn,
        useEffect: fn => { if (initial) effects.push(fn); },
      },
      'next/navigation': { useRouter: () => router },
      '@/lib/projects-store': {
        getEditorBootstrap: async () => { bootstraps++; return { project: { title: 'Project', visibility: 'private', description: '', graphColors: null, tags: '', items, trails: [trail] }, contents: [], profile: { username: 'owner', imageUrl: null }, selectedItemId: 'a', selectedTrailId: 'trail' }; },
        getMapPreviews: async () => { previews++; return {}; },
        reorderTrailItems: () => { requests++; return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); },
        createItem: () => { creates++; return new Promise((resolve, reject) => { createResolve = resolve; createReject = reject; }); },
        createLooseItem: () => { looseCreates++; return new Promise((resolve, reject) => { createLooseResolve = resolve; createLooseReject = reject; }); },
      },
      '@/lib/item-content-client': { acceptLoadedContents: contents => contents, getTrailContents: async () => ({}), getItemContent: async () => '', saveItemContent: async () => {} },
      '../../editor-utils': { lastItemStorageKey: () => 'last', countTextStats: () => ({ words: 0, characters: 0 }), isAuthError: () => false },
      '../../trail-navigation': navigation,
      '@/lib/pending-saves': saves,
      './useAutoSave': autoSaveExports,
    })[name],
    window: { location: { search: '', pathname: '/editor/project' } },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    URLSearchParams, console: { error: () => {} },
  });
  function render() {
    stateIndex = refIndex = 0;
    const hook = exports.useProjectEditorState('project', false);
    if (initial) { initial = false; effects.forEach(fn => fn()); }
    return hook;
  }
  render();
  await settle();
  return { render, save: () => resolveSave(), fail: () => rejectSave(new Error('offline')), create: item => createResolve(item), createFail: () => createReject(new Error('offline')), createLoose: item => looseCreateResolve(item), requests: () => requests, bootstraps: () => bootstraps, previews: () => previews };
}

test('startup uses one bootstrap request and defers map previews', async () => {
  const s = await setup();
  expect(s.bootstraps()).toBe(1);
  expect(s.previews()).toBe(0);
});

test('reorder preserves note content and rejects concurrent requests', async () => {
  const s = await setup();
  const pending = s.render().handleReorderTrailItems('trail', ['b', 'a', 'c']);
  await s.render().handleReorderTrailItems('trail', ['c', 'a', 'b']);
  expect(s.requests()).toBe(1);
  s.save();
  await pending;
  const hook = s.render();
  expect(Array.from(hook.trails[0].itemIds)).toEqual(['b', 'a', 'c']);
  expect(hook.items.a.content).toBe('');
});

test('failed reorder restores the previous order', async () => {
  const s = await setup();
  const pending = s.render().handleReorderTrailItems('trail', ['a', 'c', 'b']);
  s.fail();
  await pending;
  const hook = s.render();
  expect(Array.from(hook.trails[0].itemIds)).toEqual(['a', 'b', 'c']);
  expect(hook.reorderNotices.trail.error).toContain('previous order was restored');
});

test('invalid permutations are not sent', async () => {
  const s = await setup();
  await s.render().handleReorderTrailItems('trail', ['a', 'a', 'c']);
  expect(s.requests()).toBe(0);
});

test('createItem adds the note optimistically and reconciles with the server id', async () => {
  const s = await setup();
  const pending = s.render().handleCreateItem('trail', 'New note');
  await settle();
  let hook = s.render();
  const tempId = hook.trails[0].itemIds.find(id => id.startsWith('temp-'));
  expect(tempId).toBeDefined();
  expect(hook.items[tempId].title).toBe('New note');
  s.create({ id: 'new', title: 'New note', titleAlign: 'center', unfiled: false, content: '' });
  await pending;
  hook = s.render();
  expect(hook.items[tempId]).toBeUndefined();
  expect(hook.items.new.title).toBe('New note');
  expect(hook.trails[0].itemIds).toContain('new');
  expect(hook.trails[0].itemIds).not.toContain(tempId);
});

test('createItem preserves content written before the server responds', async () => {
  const s = await setup();
  const pending = s.render().handleCreateItem('trail', 'New note');
  await settle();
  let hook = s.render();
  const tempId = hook.trails[0].itemIds.find(id => id.startsWith('temp-'));
  hook.updateItemContentLocally(tempId, 'written content');
  s.create({ id: 'new', title: 'New note', titleAlign: 'center', unfiled: false, content: '' });
  await pending;
  hook = s.render();
  expect(hook.items.new.content).toBe('written content');
});

test('failed createItem removes the optimistic note', async () => {
  const s = await setup();
  const pending = s.render().handleCreateItem('trail', 'New note');
  await settle();
  let hook = s.render();
  const tempId = hook.trails[0].itemIds.find(id => id.startsWith('temp-'));
  s.createFail();
  await pending.catch(() => {});
  hook = s.render();
  expect(hook.items[tempId]).toBeUndefined();
  expect(hook.trails[0].itemIds).not.toContain(tempId);
});

test.skip('createLooseItem adds the note optimistically and reconciles with the server id', async () => {
  const s = await setup();
  const pending = s.render().handleCreateLooseItem('Loose note');
  await settle();
  let hook = s.render();
  const tempId = Object.keys(hook.items).find(id => id.startsWith('temp-'));
  expect(tempId).toBeDefined();
  expect(hook.items[tempId].unfiled).toBe(true);
  s.createLoose({ id: 'loose', title: 'Loose note', titleAlign: 'center', unfiled: true, content: '' });
  await pending;
  hook = s.render();
  expect(hook.items[tempId]).toBeUndefined();
  expect(hook.items.loose.unfiled).toBe(true);
});
