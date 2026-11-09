import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const transpile = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const load = (path, context = {}) => {
  const exports = {};
  runInNewContext(transpile(path), { exports, ...context });
  return exports;
};
const settle = () => new Promise(resolve => setImmediate(resolve));
const structureModule = load('app/editor/structure.ts');
const saves = load('lib/pending-saves.ts');
const navigation = load('app/editor/trail-navigation.ts');

const snapshot = (version, { items = [['1', 'One'], ['2', 'Two'], ['3', 'Three']], trails = [['10', 'Trail', ['1', '2', '3']]], restoreEpoch = 0 } = {}) => JSON.stringify({
  version, restoreEpoch,
  items: items.map(([id, title, unfiled = false]) => ({ id: Number(id), title, titleAlign: 'center', unfiled, words: 0, characters: 0 })),
  trails: trails.map(([id, title, itemIds]) => ({ id: Number(id), title, description: '', version: 1, forkedFromId: null, itemIds: itemIds.map(Number) })),
});

async function setup() {
  const states = [], refs = [], effects = [], timers = [], calls = [];
  let stateIndex = 0, refIndex = 0, initial = true, bootstraps = 0;
  const request = name => (...args) => new Promise((resolve, reject) => calls.push({ name, args, resolve, reject }));
  const titleSaves = load('lib/item-title-saves.ts', {
    Error, setTimeout: () => 0, clearTimeout() {},
    require: name => name === '@/lib/projects-store' ? { saveDraftMetadata: async () => ({ status: 200 }) } : {},
  });
  const exports = load('app/editor/[projectId]/hooks/useProjectEditorState.ts', {
    URLSearchParams, console: { error() {} },
    setTimeout: fn => { timers.push(fn); return timers.length; },
    window: { location: { search: '', pathname: '/editor/project' }, addEventListener() {}, removeEventListener() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    require: name => ({
      '@/app/editor/note-content': {},
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
      'next/navigation': { useRouter: () => ({ replace() {} }) },
      '@/lib/editor-bootstrap-client': {
        getEditorBootstrap: async () => {
          bootstraps++;
          const structure = structureModule.parseStructure(snapshot(0));
          const items = Object.fromEntries(Object.entries(structure.items).map(([id, item]) => [id, { ...item, content: null }]));
          return { structure, project: { title: 'Project', visibility: 'private', description: '', graphColors: null, tags: '', items, trails: structure.trails },
            contents: { 1: 'one body', 2: 'two body', 3: 'three body' }, profile: { username: 'owner', imageUrl: null }, selectedItemId: '1', selectedTrailId: '10' };
        },
      },
      '@/lib/projects-store': {
        reorderTrailItems: request('reorder'), renameTrail: request('renameTrail'), createItem: request('createItem'),
        deleteItem: request('deleteItem'), getMapPreviews: async () => ({}),
      },
      '@/lib/item-content-client': { resetItemContents() {}, acceptLoadedContents: contents => contents, getTrailContents: async () => ({}), getItemContent: async () => '' },
      '../../editor-utils': { lastItemStorageKey: () => 'last', countTextStats: content => ({ words: content ? 1 : 0, characters: content.length }) },
      '../../trail-navigation': navigation,
      '@/lib/pending-saves': saves,
      '@/lib/item-title-saves': titleSaves,
      '@/app/editor/[projectId]/hooks/useAutoSave': { useAutoSave: () => ({}) },
      '@/app/editor/structure': structureModule,
    })[name],
  });
  const render = () => {
    stateIndex = refIndex = 0;
    const hook = exports.useProjectEditorState('project', false);
    if (initial) { initial = false; effects.forEach(fn => fn()); }
    return hook;
  };
  render();
  await settle();
  const call = name => calls.find(candidate => candidate.name === name && !candidate.done);
  return {
    render, calls, bootstraps: () => bootstraps,
    receive: raw => render().receiveStructure(raw),
    resolve: async (name, value) => { const pending = call(name); pending.done = true; pending.resolve(value); await settle(); },
    reject: async name => { const pending = call(name); pending.done = true; pending.reject(new Error('offline')); await settle(); },
    expire: () => timers.splice(0).forEach(fn => fn()),
    order: () => Array.from(render().trails[0].itemIds),
  };
}

test('remote structure changes appear without touching loaded content or the open note', async () => {
  const s = await setup();
  s.receive(snapshot(1, { items: [['1', 'One renamed'], ['2', 'Two'], ['4', 'Four']], trails: [['10', 'Trail', ['4', '1', '2']]] }));
  const { items, selectedItemId } = s.render();
  expect(s.order()).toEqual(['4', '1', '2']);
  expect(items['1'].title).toBe('One renamed');
  expect(items['1'].content).toBe('one body');
  expect(items['3']).toBeUndefined();
  expect(items['4'].content).toBeNull();
  expect(selectedItemId).toBe('1');
  s.receive(snapshot(2, { items: [['2', 'Two'], ['4', 'Four']], trails: [['10', 'Trail', ['4', '2']]] }));
  expect(s.render().selectedItemId).toBe('4');
});

test('older or invalid snapshots never replace a newer one', async () => {
  const s = await setup();
  s.receive(snapshot(3, { items: [['1', 'Newest'], ['2', 'Two'], ['3', 'Three']] }));
  for (const raw of [snapshot(2, { items: [['1', 'Older'], ['2', 'Two'], ['3', 'Three']] }), snapshot(3, { items: [['1', 'Same version'], ['2', 'Two'], ['3', 'Three']] }), '{"version":9}', 'garbage']) s.receive(raw);
  expect(s.render().items['1'].title).toBe('Newest');
});

test('a confirmed local change survives stale snapshots and is dropped once the remote has it', async () => {
  const s = await setup();
  const pending = s.render().handleReorderTrailItems('10', ['3', '1', '2']);
  expect(s.order()).toEqual(['3', '1', '2']);
  s.receive(snapshot(1, { items: [['1', 'Remote title'], ['2', 'Two'], ['3', 'Three']] }));
  expect(s.order()).toEqual(['3', '1', '2']);
  expect(s.render().items['1'].title).toBe('Remote title');
  await s.resolve('reorder');
  await pending;
  s.receive(snapshot(2, { items: [['1', 'Remote title'], ['2', 'Two'], ['3', 'Three']] }));
  expect(s.order()).toEqual(['3', '1', '2']);
  s.receive(snapshot(4, { trails: [['10', 'Trail', ['3', '1', '2']]] }));
  s.receive(snapshot(5, { trails: [['10', 'Trail', ['2', '3', '1']]] }));
  expect(s.order()).toEqual(['2', '3', '1']);
});

test('a failed change goes back to the remote structure, including changes that arrived meanwhile', async () => {
  const s = await setup();
  const pending = s.render().handleReorderTrailItems('10', ['3', '2', '1']);
  s.receive(snapshot(1, { items: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['5', 'Five']], trails: [['10', 'Trail', ['1', '2', '3', '5']]] }));
  expect(s.order()).toEqual(['3', '2', '1', '5']);
  await s.reject('reorder');
  await pending;
  expect(s.order()).toEqual(['1', '2', '3', '5']);
});

test('a confirmed change overridden elsewhere gives way after the grace period', async () => {
  const s = await setup();
  const pending = s.render().handleRenameTrail('10', 'Mine');
  await s.resolve('renameTrail');
  await pending;
  s.receive(snapshot(1, { trails: [['10', 'Theirs', ['1', '2', '3']]] }));
  expect(s.render().trails[0].title).toBe('Mine');
  s.expire();
  expect(s.render().trails[0].title).toBe('Theirs');
});

test('a created note keeps its editor key and content when the server confirms it', async () => {
  const s = await setup();
  const pending = s.render().handleCreateItem('10', 'Fresh');
  const tempId = s.order()[3];
  expect(tempId).toMatch(/^temp-/);
  s.render().updateItemContentLocally(tempId, 'typed early');
  await s.resolve('createItem', { id: '7', title: 'Fresh', titleAlign: 'center', unfiled: false, content: '' });
  await pending;
  expect(s.order()).toEqual(['1', '2', '3', '7']);
  expect(s.render().items['7']).toMatchObject({ editorKey: tempId, content: 'typed early' });
  expect(s.render().selectedItemId).toBe('7');
  s.receive(snapshot(1, { items: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['7', 'Fresh']], trails: [['10', 'Trail', ['1', '2', '3', '7']]] }));
  s.receive(snapshot(2, { items: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['7', 'Renamed elsewhere']], trails: [['10', 'Trail', ['1', '2', '3', '7']]] }));
  expect(s.render().items['7']).toMatchObject({ editorKey: tempId, content: 'typed early', title: 'Renamed elsewhere' });
});

test('once operations settle every client shows the API structure, whatever order snapshots arrive in', async () => {
  const s = await setup();
  const final = snapshot(4, { items: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['7', 'Fresh']], trails: [['10', 'Renamed', ['3', '1', '2', '7']]] });
  const history = [
    snapshot(1, { trails: [['10', 'Trail', ['3', '1', '2']]] }),
    snapshot(2, { trails: [['10', 'Renamed', ['3', '1', '2']]] }),
    snapshot(3, { items: [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['7', 'Fresh']], trails: [['10', 'Renamed', ['3', '1', '2', '7']]] }),
    final,
  ];
  const reorder = s.render().handleReorderTrailItems('10', ['3', '1', '2']);
  const rename = s.render().handleRenameTrail('10', 'Renamed');
  const create = s.render().handleCreateItem('10', 'Fresh');
  s.receive(history[1]);
  await s.resolve('reorder');
  s.receive(history[0]);
  await s.resolve('renameTrail');
  await s.resolve('createItem', { id: '7', title: 'Fresh', titleAlign: 'center', unfiled: false, content: '' });
  await Promise.all([reorder, rename, create]);
  for (const raw of [history[3], history[2], history[0]]) s.receive(raw);
  const expected = structureModule.parseStructure(final);
  const { trails, items } = s.render();
  expect(trails.map(trail => [trail.id, trail.title, Array.from(trail.itemIds)])).toEqual(expected.trails.map(trail => [trail.id, trail.title, trail.itemIds]));
  expect(Object.keys(items).sort()).toEqual(Object.keys(expected.items).sort());
  s.expire();
  expect(s.render().trails.map(trail => trail.title)).toEqual(['Renamed']);
});

test('a restore elsewhere reloads the project instead of mixing epochs', async () => {
  const s = await setup();
  s.receive(snapshot(5, { restoreEpoch: 1, items: [['9', 'Restored']], trails: [['10', 'Trail', ['9']]] }));
  expect(s.render().items['9']).toBeUndefined();
  s.receive(snapshot(6, { items: [['8', 'After']], trails: [['10', 'Trail', ['8']]] }));
  expect(s.render().items['8']).toBeUndefined();
});
