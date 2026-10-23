import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const transpile = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const settle = () => new Promise(resolve => setImmediate(resolve));

async function setup(extraTrails = []) {
  const states = [], refs = [], effects = [];
  let stateIndex = 0, refIndex = 0, initial = true;
  let resolveSave, rejectSave, requests = 0, bootstraps = 0, previews = 0;
  let createResolve, createReject, looseCreateResolve, looseCreateReject;
  const contentResets = [];
  const renameRequests = [];
  const itemRenameRequests = [];
  const attaches = [], detaches = [];
  const orders = [];
  const projectOrders = [];
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
        useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
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
  const titleSaves = {}, titleClient = {}, titleTimers = new Map();
  runInNewContext(transpile('lib/editor-draft-client.ts'), { exports: titleClient, Error });
  let titleNow = 0, titleTimerId = 0;
  runInNewContext(transpile('lib/item-title-saves.ts'), {
    exports: titleSaves, Date: { now: () => titleNow }, Error,
    setTimeout: (fn, delay) => { const id = ++titleTimerId; titleTimers.set(id, { fn, due: titleNow + delay }); return id; },
    clearTimeout: id => titleTimers.delete(id),
    require: name => name === '@/lib/projects-store' ? { saveDraftMetadata: (_projectId, _entity, itemId, fields) => new Promise((resolve, reject) => {
      itemRenameRequests.push({ itemId, title: fields.title, resolve: () => resolve({ status: 200 }), reject });
    }) } : name === '@/lib/editor-draft-client' ? titleClient : {},
  });
  const exports = {};
  const router = { replace: () => {} };
  runInNewContext(transpile('app/editor/[projectId]/hooks/useProjectEditorState.ts'), {
    exports,
    require: name => ({
      react: {
        useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
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
        getEditorBootstrap: async () => { bootstraps++; return { project: { title: 'Project', visibility: 'private', description: '', graphColors: null, tags: '', items, trails: [trail, ...extraTrails] }, contents: [], profile: { username: 'owner', imageUrl: null }, selectedItemId: 'a', selectedTrailId: 'trail' }; },
      },
      '@/lib/projects-store': {
        reorderProjectTrails: (projectId, trailIds) => new Promise((resolve, reject) => projectOrders.push({ projectId, trailIds, resolve, reject })),
        attachItemToTrail: (trailId, itemId) => new Promise((resolve, reject) => attaches.push({ trailId, itemId, resolve, reject })),
        detachItemFromTrail: (trailId, itemId) => new Promise((resolve, reject) => detaches.push({ trailId, itemId, resolve, reject })),
        renameTrail: (trailId, title) => new Promise((resolve, reject) => { renameRequests.push({ trailId, title, resolve, reject }); }),
        renameItem: (itemId, title) => new Promise((resolve, reject) => { itemRenameRequests.push({ itemId, title, resolve, reject }); }),
        getMapPreviews: async () => { previews++; return {}; },
        reorderTrailItems: (trailId, itemIds) => { orders.push({ trailId, itemIds }); requests++; return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); },
        createItem: () => new Promise((resolve, reject) => { createResolve = resolve; createReject = reject; }),
        createLooseItem: () => new Promise((resolve, reject) => { looseCreateResolve = resolve; looseCreateReject = reject; }),
      },
      '@/lib/item-content-client': { resetItemContents: ids => contentResets.push(ids), acceptLoadedContents: contents => contents, getTrailContents: async () => ({}), getItemContent: async () => '', saveItemContent: async () => {} },
      '../../editor-utils': { lastItemStorageKey: () => 'last', countTextStats: () => ({ words: 0, characters: 0 }), isAuthError: () => false },
      '../../trail-navigation': navigation,
      '@/lib/pending-saves': saves,
      '@/lib/item-title-saves': titleSaves,
      '@/app/editor/[projectId]/hooks/useAutoSave': autoSaveExports,
    })[name],
    window: { location: { search: '', pathname: '/editor/project' }, addEventListener() {}, removeEventListener() {} },
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
  return { runTitleTimers: async () => { const [id, timer] = [...titleTimers].sort((a, b) => a[1].due - b[1].due)[0]; titleNow = timer.due; titleTimers.delete(id); timer.fn(); await settle(); }, render, save: () => resolveSave(), fail: () => rejectSave(new Error('offline')), create: item => createResolve(item), createFail: () => createReject(new Error('offline')), createLoose: item => looseCreateResolve(item), createLooseFail: () => looseCreateReject(new Error('offline')), requests: () => requests, bootstraps: () => bootstraps, previews: () => previews, contentResets, autoSaveRequests,
    renameRequests,
    itemRenameRequests,
    attaches, detaches, orders, projectOrders,
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

test('sidebar and editor note renames stay optimistic and coalesce before saving', async () => {
  const s = await setup();
  await s.render().handleRenameItem('a', 'First');
  expect(s.render().items.a.title).toBe('First');
  s.render().commitItemTitle('a', 'First', '  Second  ');
  expect(s.render().items.a.title).toBe('Second');
  expect(s.itemRenameRequests).toHaveLength(0);
  const flush = s.render().flushProjectChanges();
  expect(s.itemRenameRequests).toHaveLength(1);
  expect(s.itemRenameRequests[0].title).toBe('Second');
  s.itemRenameRequests[0].resolve();
  await flush;
  expect(s.render().items.a.title).toBe('Second');
  expect(s.render().items.a.content).toBe('');
});

test('failed note renames stay visible and retry automatically after backoff', async () => {
  const s = await setup();
  await s.render().handleRenameItem('a', 'Renamed');
  const failed = s.render().flushProjectChanges();
  s.itemRenameRequests[0].reject(new Error('offline'));
  await expect(failed).rejects.toThrow('offline');
  expect(s.render().items.a.title).toBe('Renamed');
  expect(s.render().titleSaveError).toContain('kept locally');
  await s.runTitleTimers();
  expect(s.itemRenameRequests[1].title).toBe('Renamed');
  s.itemRenameRequests[1].resolve();
  await settle();
  await s.render().flushProjectChanges();
  expect(s.render().titleSaveError).toBe('');
});

test('moving a note is optimistic, attaches before detaching, and follows the selected note', async () => {
  const s = await setup([{ id: 'target', itemIds: [], steps: [] }]);
  const pending = s.render().handleMoveItemToTrail('trail', 'target', 'a');
  expect(Array.from(s.render().trails[0].itemIds)).toEqual(['b', 'c']);
  expect(Array.from(s.render().trails[1].itemIds)).toEqual(['a']);
  expect(s.render().items.a.content).toBe('');
  expect(s.attaches[0].trailId).toBe('target');
  expect(s.detaches).toHaveLength(0);
  await expect(s.render().handleMoveItemToTrail('target', 'trail', 'a')).rejects.toThrow('Wait');
  await s.render().handleReorderTrailItems('trail', ['c', 'b']);
  expect(s.requests()).toBe(0);
  s.attaches[0].resolve();
  await settle();
  expect(s.detaches[0].trailId).toBe('trail');
  s.detaches[0].resolve();
  await pending;
  expect(s.render().activeTrailId).toBe('target');
  expect(s.render().selectedItemId).toBe('a');
  await s.render().flushProjectChanges();
});

test.each([0, 1, 2])('moving a note saves insertion position %i before removing it from the source', async index => {
  const s = await setup([{ id: 'target', itemIds: ['b', 'c'], steps: [{ itemId: 'b' }, { itemId: 'c' }] }]);
  const expected = ['b', 'c'];
  expected.splice(index, 0, 'a');
  const pending = s.render().handleMoveItemToTrail('trail', 'target', 'a', index);
  expect(Array.from(s.render().trails[1].itemIds)).toEqual(expected);
  expect(Array.from(s.render().trails[1].steps, step => step.itemId)).toEqual(expected);
  s.attaches[0].resolve();
  await settle();
  if (index < 2) {
    expect(s.orders[0].trailId).toBe('target');
    expect(Array.from(s.orders[0].itemIds)).toEqual(expected);
    expect(s.detaches).toHaveLength(0);
    s.save();
    await settle();
  }
  s.detaches[0].resolve();
  await pending;
  expect(Array.from(s.render().trails[1].itemIds)).toEqual(expected);
});

test('failed destination reorder restores its saved order and keeps the source note', async () => {
  const s = await setup([{ id: 'target', itemIds: ['b', 'c'], steps: [{ itemId: 'b' }, { itemId: 'c' }] }]);
  const pending = s.render().handleMoveItemToTrail('trail', 'target', 'a', 0);
  s.attaches[0].resolve();
  await settle();
  s.fail();
  await expect(pending).rejects.toThrow('both trails');
  expect(s.detaches).toHaveLength(0);
  expect(Array.from(s.render().trails[0].itemIds)).toEqual(['a', 'b', 'c']);
  expect(Array.from(s.render().trails[1].itemIds)).toEqual(['b', 'c', 'a']);
});

test('moving a shared note to a chosen position does not duplicate it', async () => {
  const s = await setup([{ id: 'target', itemIds: ['a', 'b', 'c'], steps: ['a', 'b', 'c'].map(itemId => ({ itemId })) }]);
  const pending = s.render().handleMoveItemToTrail('trail', 'target', 'a', 3);
  expect(Array.from(s.render().trails[1].itemIds)).toEqual(['b', 'c', 'a']);
  s.attaches[0].resolve();
  await settle();
  s.save();
  await settle();
  s.detaches[0].resolve();
  await pending;
});

test('failed attach restores both trails without detaching the note', async () => {
  const s = await setup([{ id: 'target', itemIds: [], steps: [] }]);
  const pending = s.render().handleMoveItemToTrail('trail', 'target', 'b');
  s.attaches[0].reject(new Error('offline'));
  await expect(pending).rejects.toThrow('original trail');
  expect(Array.from(s.render().trails[0].itemIds)).toEqual(['a', 'b', 'c']);
  expect(Array.from(s.render().trails[1].itemIds)).toEqual([]);
  expect(s.detaches).toHaveLength(0);
});

test('failed detach keeps the note in both trails and allows retry without duplicates', async () => {
  const s = await setup([{ id: 'target', itemIds: ['a'], steps: [{ itemId: 'a' }] }]);
  const pending = s.render().handleMoveItemToTrail('trail', 'target', 'a');
  s.attaches[0].resolve();
  await settle();
  s.detaches[0].reject(new Error('offline'));
  await expect(pending).rejects.toThrow('both trails');
  expect(Array.from(s.render().trails[0].itemIds)).toEqual(['a', 'b', 'c']);
  expect(Array.from(s.render().trails[1].itemIds)).toEqual(['a']);
  const retry = s.render().handleMoveItemToTrail('trail', 'target', 'a');
  s.attaches[1].resolve();
  await settle();
  s.detaches[1].resolve();
  await retry;
  expect(Array.from(s.render().trails[1].itemIds)).toEqual(['a']);
  await s.render().flushProjectChanges();
});

test('rolling back a move preserves notes created while it was saving', async () => {
  const s = await setup([{ id: 'target', itemIds: [], steps: [] }]);
  const move = s.render().handleMoveItemToTrail('trail', 'target', 'b');
  const create = s.render().handleCreateItem('trail', 'New');
  s.create({ id: 'new', title: 'New', content: '' });
  await create;
  s.attaches[0].reject(new Error('offline'));
  await expect(move).rejects.toThrow('original trail');
  expect(Array.from(s.render().trails[0].itemIds)).toEqual(['a', 'b', 'c', 'new']);
  expect(Array.from(s.render().trails[0].steps, step => step.itemId)).toEqual(['a', 'b', 'c', 'new']);
});

test('moving to the same or an unknown trail does nothing', async () => {
  const s = await setup();
  await s.render().handleMoveItemToTrail('trail', 'trail', 'a');
  await s.render().handleMoveItemToTrail('trail', 'unknown', 'a');
  expect(s.attaches).toHaveLength(0);
});

test('trail order updates optimistically without changing selected note or contents', async () => {
  const s = await setup([{ id: 'second', itemIds: ['a'], steps: [{ itemId: 'a' }] }]);
  const pending = s.render().handleReorderTrails(['second', 'trail']);
  expect(Array.from(s.render().trails, trail => trail.id)).toEqual(['second', 'trail']);
  expect(s.render().activeTrailId).toBe('trail');
  expect(s.render().selectedItemId).toBe('a');
  expect(s.render().items.a.content).toBe('');
  await s.render().handleReorderTrails(['trail', 'second']);
  expect(s.projectOrders).toHaveLength(1);
  expect(Array.from(s.projectOrders[0].trailIds)).toEqual(['second', 'trail']);
  s.projectOrders[0].resolve();
  await pending;
  await s.render().flushProjectChanges();
});

test('failed trail order restores order without overwriting a concurrent rename and can retry', async () => {
  const s = await setup([{ id: 'second', itemIds: [], steps: [] }]);
  const pending = s.render().handleReorderTrails(['second', 'trail']);
  const rename = s.render().handleRenameTrail('second', 'Renamed');
  s.renameRequests[0].resolve();
  await rename;
  s.projectOrders[0].reject(new Error('offline'));
  await pending;
  expect(Array.from(s.render().trails, trail => trail.id)).toEqual(['trail', 'second']);
  expect(s.render().trails[1].title).toBe('Renamed');
  expect(s.render().trailOrderError).toContain('previous order');
  const retry = s.render().handleReorderTrails(['second', 'trail']);
  expect(s.render().trailOrderError).toBe(null);
  s.projectOrders[1].resolve();
  await retry;
  await s.render().flushProjectChanges();
});

test('invalid trail orders do not change local state or reach the server', async () => {
  const s = await setup([{ id: 'second', itemIds: [], steps: [] }]);
  for (const ids of [['trail'], ['trail', 'trail'], ['trail', 'missing']]) await s.render().handleReorderTrails(ids);
  expect(s.projectOrders).toHaveLength(0);
  expect(Array.from(s.render().trails, trail => trail.id)).toEqual(['trail', 'second']);
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
