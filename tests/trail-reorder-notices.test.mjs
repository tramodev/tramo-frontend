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
  let resolveSave, rejectSave, requests = 0;
  const items = Object.fromEntries(['a', 'b', 'c'].map(id => [id, { id, title: id, associations: [], content: '' }]));
  const steps = ['a', 'b', 'c'].map(id => ({ itemId: id, annotation: id === 'b' ? 'Because A comes before B' : null, associationId: id === 'b' ? 'ab' : null }));
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
        getProject: async () => ({ title: 'Project', items, trails: [trail] }),
        reorderTrailItems: () => { requests++; return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); },
        updateStep: async () => {},
      },
      '@/lib/profile': { getMyProfile: async () => ({ username: 'owner' }) },
      '@/lib/item-content-client': { getTrailContents: async () => ({}), getItemContent: async () => '' },
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
    const hook = exports.useProjectEditorState('project');
    if (initial) { initial = false; effects.forEach(fn => fn()); }
    return hook;
  }
  render();
  await settle();
  return { render, save: () => resolveSave(), fail: () => rejectSave(new Error('offline')), requests: () => requests };
}

test('reorder preserves step data and warns only after saving, including moving an annotated note first', async () => {
  const s = await setup();
  const pending = s.render().handleReorderTrailItems('trail', ['b', 'a', 'c']);
  let hook = s.render();
  expect(Array.from(hook.trails[0].itemIds)).toEqual(['b', 'a', 'c']);
  expect(hook.trails[0].steps[0].annotation).toBe('Because A comes before B');
  expect(hook.trails[0].steps[0].associationId).toBe('ab');
  expect(hook.reorderNotices.trail).toBeUndefined();
  s.save();
  await pending;
  hook = s.render();
  expect(Array.from(hook.reorderNotices.trail.reviewItemIds)).toEqual(['b']);
  hook.dismissReorderNotice('trail');
  expect(s.render().reorderNotices.trail).toBeUndefined();
});

test('failed reorder restores order without losing annotations edited during the request', async () => {
  const s = await setup();
  const pending = s.render().handleReorderTrailItems('trail', ['a', 'c', 'b']);
  await s.render().handleUpdateAnnotation('trail', 'b', 'Updated during save');
  s.fail();
  await pending;
  const hook = s.render();
  expect(Array.from(hook.trails[0].itemIds)).toEqual(['a', 'b', 'c']);
  expect(hook.trails[0].steps[1].annotation).toBe('Updated during save');
  expect(hook.reorderNotices.trail.reviewItemIds).toHaveLength(0);
  expect(hook.reorderNotices.trail.error).toContain('previous order was restored');
});

test('review notices accumulate until dismissed and simultaneous saves do not overwrite each other', async () => {
  const s = await setup();
  let pending = s.render().handleReorderTrailItems('trail', ['a', 'c', 'b']);
  await s.render().handleReorderTrailItems('trail', ['c', 'a', 'b']);
  expect(s.requests()).toBe(1);
  s.save();
  await pending;
  await s.render().handleUpdateAnnotation('trail', 'c', 'A step explanation');
  pending = s.render().handleReorderTrailItems('trail', ['a', 'b', 'c']);
  s.save();
  await pending;
  expect(Array.from(s.render().reorderNotices.trail.reviewItemIds)).toEqual(['b', 'c']);
});

test('unchanged predecessors and invalid permutations do not generate review notices', async () => {
  const s = await setup();
  await s.render().handleReorderTrailItems('trail', ['a', 'a', 'c']);
  expect(s.requests()).toBe(0);
  const pending = s.render().handleReorderTrailItems('trail', ['a', 'b', 'c']);
  s.save();
  await pending;
  expect(s.render().reorderNotices.trail.reviewItemIds).toHaveLength(0);
});
