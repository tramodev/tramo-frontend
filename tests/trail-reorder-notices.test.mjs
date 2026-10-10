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
  const items = Object.fromEntries(['a', 'b', 'c'].map(id => [id, { id, title: id, content: '' }]));
  const steps = ['a', 'b', 'c'].map(id => ({ itemId: id }));
  const trail = { id: 'trail', itemIds: ['a', 'b', 'c'], steps };
  const navigation = {};
  runInNewContext(transpile('app/editor/trail-navigation.ts'), { exports: navigation });
  const saves = {};
  runInNewContext(transpile('lib/pending-saves.ts'), { exports: saves });
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
      },
      '@/lib/item-content-client': { acceptLoadedContents: contents => contents, getTrailContents: async () => ({}), getItemContent: async () => '' },
      '../../editor-utils': { lastItemStorageKey: () => 'last', countTextStats: () => ({ words: 0, characters: 0 }) },
      '../../trail-navigation': navigation,
      '@/lib/pending-saves': saves,
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
  return { render, save: () => resolveSave(), fail: () => rejectSave(new Error('offline')), requests: () => requests, bootstraps: () => bootstraps, previews: () => previews };
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
