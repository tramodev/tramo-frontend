import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const settle = () => new Promise(resolve => setImmediate(resolve));

async function setup() {
  const states = [], refs = [], effects = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0;
  const original = { id: 'shared', title: 'Shared', titleAlign: 'right', content: 'original', associations: [], linkedItemIds: [], unfiled: false };
  const originalStep = { itemId: 'shared', annotation: 'Keep', associationId: 'incoming' };
  const trails = ['a', 'b', 'c'].map(id => ({ id, title: id, itemIds: ['shared'], steps: [originalStep] }));
  const requests = [];
  let rejectCopy = false;
  let finishRename;
  let rejectRename = false;
  const copy = { ...original, id: 'copy', content: 'saved snapshot' };
  const api = {
    getProject: async () => ({ title: 'Project', trails, items: { shared: original } }),
    copyItemForTrail: async (...args) => {
      requests.push(args);
      if (rejectCopy) throw new Error('offline');
      return { item: copy, steps: [{ ...originalStep, itemId: 'copy', associationId: null }] };
    },
    renameItem: () => rejectRename ? Promise.reject(new Error('title save failed')) : new Promise(resolve => { finishRename = resolve; }),
  };
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/[projectId]/hooks/useProjectEditorState.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: name => ({
      react: {
        useState: initial => {
          const i = stateIndex++;
          if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
          return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }];
        },
        useRef: initial => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
        useMemo: fn => fn(), useCallback: fn => fn,
        useEffect: (fn, deps) => {
          const i = effectIndex++;
          if (!effects[i] || deps.some((dep, index) => dep !== effects[i].deps[index])) effects[i] = { fn, deps, run: true };
        },
      },
      'next/navigation': { useRouter: () => ({ replace: () => {} }) },
      '@/lib/projects-store': api,
      '@/lib/profile': { getMyProfile: async () => ({ username: 'owner' }) },
      '@/lib/item-content-client': { getTrailContents: async () => ({}), getItemContent: async () => '' },
      '../../editor-utils': { countTextStats: () => ({ words: 1, characters: 1 }), lastItemStorageKey: () => 'last' },
      '../../trail-navigation': { resolveItemTrail: (_, __, ___, explicit) => explicit },
    })[name],
    window: { location: { search: '', pathname: '/editor/project' }, history: { replaceState: () => {} } },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    URLSearchParams,
  });
  function render() {
    stateIndex = refIndex = effectIndex = 0;
    const hook = exports.useProjectEditorState('project');
    for (const effect of effects) if (effect.run) { effect.run = false; effect.fn(); }
    return hook;
  }
  render();
  await settle();
  return { render, requests, fail: () => { rejectCopy = true; }, failRename: value => { rejectRename = value; }, finishRename: () => finishRename() };
}

test('copy updates just the current trail, keeps its annotation and selects the independent note', async () => {
  const s = await setup();
  const hook = s.render();
  expect(hook.trails.filter(trail => trail.itemIds.includes('shared'))).toHaveLength(3);
  await hook.handleCopyItemForTrail('a', 'shared');
  const copied = s.render();
  expect(copied.trails.map(trail => Array.from(trail.itemIds))).toStrictEqual([['copy'], ['shared'], ['shared']]);
  expect(copied.trails[0].steps[0].annotation).toBe('Keep');
  expect(copied.trails[0].steps[0].associationId).toBeNull();
  expect(copied.selectedItemId).toBe('copy');
  expect(copied.navigationRequest.focus).toBe(true);
  copied.updateItemContentLocally('copy', 'changed');
  expect(s.render().items.shared.content).toBe('original');
  expect(s.render().items.copy.content).toBe('changed');
});

test('copy failure preserves the original state and selection', async () => {
  const s = await setup();
  s.fail();
  await expect(s.render().handleCopyItemForTrail('a', 'shared')).rejects.toThrow('offline');
  const failed = s.render();
  expect(failed.trails.every(trail => trail.itemIds[0] === 'shared')).toBe(true);
  expect(failed.items.copy).toBeUndefined();
  expect(failed.selectedItemId).toBe('shared');
});

test('copy waits for a pending title update before requesting a backend snapshot', async () => {
  const s = await setup();
  const hook = s.render();
  const title = hook.handleRenameItem('shared', 'New title');
  const copy = hook.handleCopyItemForTrail('a', 'shared');
  await settle();
  expect(s.requests).toHaveLength(0);
  s.finishRename();
  await title;
  await copy;
  expect(s.requests).toHaveLength(1);
});


test('failed metadata saves cancel copying and remain available for retry', async () => {
  const s = await setup();
  const hook = s.render();
  s.failRename(true);
  await expect(hook.handleRenameItem('shared', 'New title')).rejects.toThrow('title save failed');
  await expect(hook.handleCopyItemForTrail('a', 'shared')).rejects.toThrow('title save failed');
  expect(s.requests).toHaveLength(0);
  expect(s.render().trails[0].itemIds[0]).toBe('shared');
  s.failRename(false);
  const retry = hook.handleCopyItemForTrail('a', 'shared');
  await settle();
  s.finishRename();
  await retry;
  expect(s.requests).toHaveLength(1);
});

test('indicator lists local and remote trails, highlights the current trail and navigates to each', () => {
  const exports = {}, navigations = [];
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('components/editor/shared-note-indicator.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: name => ({
      'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
      react: { useRef: value => ({ current: value }), useState: value => [value, () => {}] },
      'next/navigation': { useRouter: () => ({ push: path => navigations.push(path) }) },
      'lucide-react': { Check: 'Check', ChevronDown: 'ChevronDown', Copy: 'Copy' },
      '@/components/shared/confirm-dialog': { ConfirmDialog: 'ConfirmDialog' },
      '@/components/ui/dropdown-menu': Object.fromEntries(['DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuTrigger'].map(name => [name, name])),
    })[name],
  });
  const trails = ['a', 'b', 'c'].map(id => ({ id, title: id, itemIds: ['shared'] }));
  const item = { id: 'shared' };
  function flatten(element) {
    if (Array.isArray(element)) return element.flatMap(flatten);
    if (!element?.props) return [];
    return [element, ...[element.props.children].flat().flatMap(flatten)];
  }
  const props = { item, trails, activeTrailId: 'b', onCopy: async () => {}, onSelectItem: (_, trailId) => navigations.push(trailId) };
  let nodes = flatten(exports.SharedNoteIndicator(props));
  expect(nodes.find(node => node.type === 'button').props.children[1]).toBe(3);
  expect(nodes.filter(node => node.type === 'DropdownMenuItem' && node.props['aria-current'] === 'location')).toHaveLength(1);
  nodes.find(node => node.props['aria-current'] === 'location').props.onSelect();
  expect(navigations).toEqual(['b']);
  nodes = flatten(exports.SharedNoteIndicator({ ...props, item: { ...item, otherTrails: [{ id: 'd', title: 'Remote', projectId: 'opaque' }] } }));
  expect(nodes.find(node => node.type === 'button').props.children[1]).toBe(4);
  nodes.find(node => node.type === 'DropdownMenuItem' && node.props.children[0].props.children === 'Remote').props.onSelect();
  expect(navigations[1]).toBe('/editor/opaque?note=shared&trail=d&write=1');
});
