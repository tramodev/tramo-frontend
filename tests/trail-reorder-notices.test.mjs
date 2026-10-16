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
  let createResolve, createReject, looseCreateResolve, looseCreateReject;
  const contentResets = [];
  const renameRequests = [];
  const itemRenameRequests = [];
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
      addEventListener: () => {},
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
      '@/lib/editor-bootstrap-client': {
        getEditorBootstrap: async () => { bootstraps++; return { project: { title: 'Project', visibility: 'private', description: '', graphColors: null, tags: '', items, trails: [trail] }, contents: [], profile: { username: 'owner', imageUrl: null }, selectedItemId: 'a', selectedTrailId: 'trail' }; },
      },
      '@/lib/projects-store': {
        renameTrail: (trailId, title) => new Promise((resolve, reject) => { renameRequests.push({ trailId, title, resolve, reject }); }),
        renameItem: (itemId, title) => new Promise((resolve, reject) => { itemRenameRequests.push({ itemId, title, resolve, reject }); }),
        getMapPreviews: async () => { previews++; return {}; },
        reorderTrailItems: () => { requests++; return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); },
        createItem: () => new Promise((resolve, reject) => { createResolve = resolve; createReject = reject; }),
        createLooseItem: () => new Promise((resolve, reject) => { looseCreateResolve = resolve; looseCreateReject = reject; }),
      },
      '@/lib/item-content-client': { resetItemContents: ids => contentResets.push(ids), acceptLoadedContents: contents => contents, getTrailContents: async () => ({}), getItemContent: async () => '', saveItemContent: async () => {} },
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
    autoSaveRefIndex = 0;
    const hook = exports.useProjectEditorState('project', false);
    if (initial) { initial = false; effects.forEach(fn => fn()); }
    return hook;
  }
  render();
  await settle();
  return { render, save: () => resolveSave(), fail: () => rejectSave(new Error('offline')), create: item => createResolve(item), createFail: () => createReject(new Error('offline')), createLoose: item => looseCreateResolve(item), createLooseFail: () => looseCreateReject(new Error('offline')), requests: () => requests, bootstraps: () => bootstraps, previews: () => previews, contentResets, autoSaveRequests,
    renameRequests,
    itemRenameRequests,
    flushTimers: () => { for (const [id, fn] of autoSaveTimers) { autoSaveTimers.delete(id); fn(); } },
  };
}

test('trail renames update immediately even while an earlier rename is saving', async () => {
  const s = await setup();
  const first = s.render().handleRenameTrail('trail', 'First');
  expect(s.render().trails[0].title).toBe('First');
  const second = s.render().handleRenameTrail('trail', 'Second');
  expect(s.render().trails[0].title).toBe('Second');
  expect(s.renameRequests).toHaveLength(1);
  s.renameRequests[0].resolve();
  await first;
  await settle();
  expect(s.render().trails[0].title).toBe('Second');
  expect(s.renameRequests[1].title).toBe('Second');
  s.renameRequests[1].resolve();
  await second;
  expect(s.render().trails[0].title).toBe('Second');
});

test('failed trail renames remain optimistic and are retried on flush', async () => {
  const s = await setup();
  const pending = s.render().handleRenameTrail('trail', 'Renamed');
  s.renameRequests[0].reject(new Error('offline'));
  await pending;
  expect(s.render().trails[0].title).toBe('Renamed');
  const flush = s.render().flushProjectChanges();
  expect(s.renameRequests[1].title).toBe('Renamed');
  s.renameRequests[1].resolve();
  await flush;
});

test('sidebar and editor note renames update immediately without older saves restoring the title', async () => {
  const s = await setup();
  const first = s.render().handleRenameItem('a', 'First');
  expect(s.render().items.a.title).toBe('First');
  s.render().commitItemTitle('a', 'First', '  Second  ');
  expect(s.render().items.a.title).toBe('Second');
  expect(s.render().selectedItem.title).toBe('Second');
  expect(s.itemRenameRequests).toHaveLength(1);
  s.itemRenameRequests[0].resolve();
  await first;
  await settle();
  expect(s.render().items.a.title).toBe('Second');
  expect(s.itemRenameRequests[1].title).toBe('Second');
  s.itemRenameRequests[1].resolve();
  await s.render().flushProjectChanges();
  expect(s.render().items.a.title).toBe('Second');
  expect(s.render().items.a.content).toBe('');
});

test('failed note renames keep the new title and retry on flush', async () => {
  const s = await setup();
  const pending = s.render().handleRenameItem('a', 'Renamed');
  s.itemRenameRequests[0].reject(new Error('offline'));
  await pending;
  expect(s.render().items.a.title).toBe('Renamed');
  const flush = s.render().flushProjectChanges();
  expect(s.itemRenameRequests[1].title).toBe('Renamed');
  s.itemRenameRequests[1].resolve();
  await flush;
});

test('startup uses one bootstrap request and defers map previews', async () => {
  const s = await setup();
  expect(s.bootstraps()).toBe(1);
  expect(s.previews()).toBe(0);
  expect(s.contentResets).toEqual([['a', 'b', 'c']]);
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

test('createLooseItem adds the note optimistically and reconciles with the server id', async () => {
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

test.each(['trail', 'loose'])('a slow %s note creation never autosaves the temporary id', async kind => {
  const s = await setup();
  const pending = kind === 'trail' ? s.render().handleCreateItem('trail', 'New note') : s.render().handleCreateLooseItem('New note');
  await settle();
  const hook = s.render();
  const tempId = Object.keys(hook.items).find(id => id.startsWith('temp-'));
  hook.onChange(tempId, { read: fn => fn(), toJSON: () => 'written while creating' });
  s.flushTimers();
  expect(s.autoSaveRequests).toHaveLength(0);
  expect(await hook.flushPendingContent()).toBe(false);
  const item = { id: 'new', title: 'New note', titleAlign: 'center', unfiled: kind === 'loose', content: '' };
  if (kind === 'trail') s.create(item); else s.createLoose(item);
  await pending;
  s.flushTimers();
  expect(s.autoSaveRequests).toHaveLength(1);
  expect(s.autoSaveRequests[0].itemId).toBe('new');
  expect(s.autoSaveRequests[0].content).toBe(JSON.stringify('written while creating'));
  s.autoSaveRequests[0].resolve();
  await settle();
  expect(await s.render().flushPendingContent()).toBe(true);
});

test.each(['trail', 'loose'])('a failed %s note creation discards paused temporary writes', async kind => {
  const s = await setup();
  const pending = kind === 'trail' ? s.render().handleCreateItem('trail', 'New note') : s.render().handleCreateLooseItem('New note');
  await settle();
  const hook = s.render();
  const tempId = Object.keys(hook.items).find(id => id.startsWith('temp-'));
  hook.onChange(tempId, { read: fn => fn(), toJSON: () => 'draft' });
  if (kind === 'trail') s.createFail(); else s.createLooseFail();
  await expect(pending).rejects.toThrow('offline');
  hook.onChange(tempId, { read: fn => fn(), toJSON: () => 'late update' });
  s.flushTimers();
  expect(s.autoSaveRequests).toHaveLength(0);
  expect(await s.render().flushPendingContent()).toBe(true);
});

test.each(['trail', 'loose'])('a fast %s creation keeps edits made before the optimistic timer fires', async kind => {
  const s = await setup();
  const pending = kind === 'trail' ? s.render().handleCreateItem('trail', 'New note') : s.render().handleCreateLooseItem('New note');
  await settle();
  const hook = s.render();
  const tempId = Object.keys(hook.items).find(id => id.startsWith('temp-'));
  hook.onChange(tempId, { read: fn => fn(), toJSON: () => 'typed just before the response' });
  const sequence = hook.navigationRequest.sequence;
  const item = { id: 'new', title: 'New note', titleAlign: 'center', unfiled: kind === 'loose', content: '' };
  if (kind === 'trail') s.create(item); else s.createLoose(item);
  await pending;
  const reconciled = s.render();
  const confirmed = reconciled.items.new;
  expect(confirmed.content).toBe(JSON.stringify('typed just before the response'));
  expect(confirmed.editorKey).toBe(tempId);
  expect(reconciled.navigationRequest.sequence).toBe(sequence);
  expect(reconciled.navigationRequest.itemId).toBe('new');
  s.flushTimers();
  expect(s.autoSaveRequests[0].itemId).toBe('new');
  s.autoSaveRequests[0].resolve();
  await settle();
});
