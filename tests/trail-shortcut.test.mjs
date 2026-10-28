import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup({ next = true, previous = false, emptyPrevious = false, active = true, draft = false } = {}) {
  const exports = {}, listeners = [], removed = [], effects = [], selected = [], created = [], moves = [], selectedItems = [];
  runInNewContext(ts.transpileModule(readFileSync('app/editor/[projectId]/components/WriteView.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    window: { addEventListener: (...args) => listeners.push(args), removeEventListener: (...args) => removed.push(args) },
    require: name => ({
      react: { useState: value => [typeof value === 'function' ? value() : value, next => { if (next?.itemId) moves.push(next); }], useRef: value => ({ current: value }), useMemo: fn => fn(), useCallback: fn => fn, useEffect: fn => effects.push(fn) },
      'react/jsx-runtime': { jsx: () => ({}), jsxs: () => ({}), Fragment: 'Fragment' },
      '@/hooks/use-scroll-spy': { useScrollSpy() {} },
      '@/app/editor/[projectId]/hooks/useVirtualNotes': { useVirtualNotes: () => ({ visibleIds: new Set(), selectionIds: new Set(), heights: new Map() }) },
    })[name] ?? {},
  });
  const items = { a: { id: 'a', content: '' }, b: { id: 'b', content: '' }, previousFirst: { id: 'previousFirst', content: null }, previousLast: { id: 'previousLast', content: null } };
  const trail = { id: 'first', itemIds: ['a', 'b'], steps: [{ itemId: 'a' }, { itemId: 'b' }] };
  const trails = [...(previous ? [{ id: 'previous', itemIds: emptyPrevious ? [] : ['previousFirst', 'previousLast'] }] : []), trail, ...(next ? [{ id: 'next' }] : [])];
  exports.WriteView({ item: items.a, items, trail, trails, active, draft,
    onSelectTrail: id => selected.push(id), onSelectItem: (item, trailId) => selectedItems.push([item.id, trailId]), onCreateItem: (...args) => created.push(args), onVisibleItem() {} });
  const cleanups = effects.map(fn => fn());
  const listener = listeners.find(([type]) => type === 'keydown')?.[1];
  const send = (origin = 'b', keys = {}, excluded = false) => {
    let prevented = false;
    const event = { key: 'ArrowDown', metaKey: true, altKey: true, ...keys,
      target: { closest: selector => selector === '[data-item-id]' ? { dataset: { itemId: origin } }
        : selector === '.trail-item-editor' ? {}
        : selector.includes('[role="dialog"]') && excluded ? {} : null },
      preventDefault: () => { prevented = true; },
    };
    listener?.(event);
    return prevented;
  };
  return { listeners, removed, selected, created, moves, selectedItems, send, cleanup: () => cleanups.forEach(fn => fn?.()) };
}

test('Command+Option+Down continues to the next trail from its last note', () => {
  const s = setup();
  expect(s.send()).toBe(true);
  expect(s.selected).toEqual(['next']);
  expect(s.created).toEqual([]);
});

test('Command+Option+Down moves to the next note before advancing trails', () => {
  const s = setup();
  expect(s.send('a')).toBe(true);
  expect(s.selected).toEqual([]);
  expect(s.moves).toEqual([expect.objectContaining({ itemId: 'b', direction: 1 })]);
  const last = setup({ next: false });
  expect(last.send()).toBe(true);
  expect(last.selected).toEqual([]);
  expect(last.moves).toEqual([]);
});

test('other key combinations, composing text and dialogs keep their own behavior', () => {
  const s = setup();
  for (const keys of [{ metaKey: false }, { altKey: false }, { key: 'ArrowRight' }, { key: 'Enter' }, { shiftKey: true }, { isComposing: true }]) {
    expect(s.send('b', keys)).toBe(false);
  }
  expect(s.send('b', {}, true)).toBe(false);
  expect(s.selected).toEqual([]);
});

test('inactive and draft editors do not intercept the shortcut', () => {
  for (const options of [{ active: false }, { draft: true }]) {
    expect(setup(options).listeners.filter(([type]) => type === 'keydown')).toEqual([]);
  }
});

test('leaving the editor removes its keyboard listener', () => {
  const s = setup(); s.cleanup();
  expect(s.removed).toEqual(s.listeners);
});

test('Command+Enter still creates a note without changing trails', () => {
  const s = setup();
  expect(s.send('b', { key: 'Enter', altKey: false })).toBe(true);
  expect(s.created).toEqual([['first', 'Untitled']]);
  expect(s.selected).toEqual([]);
});

test('Command+Option+Up still moves to the previous note within the trail', () => {
  const s = setup();
  expect(s.send('b', { key: 'ArrowUp' })).toBe(true);
  expect(s.moves).toEqual([expect.objectContaining({ itemId: 'a', direction: -1 })]);
  expect(s.selected).toEqual([]);
});

test('Command+Option+Up continues to the last note of the previous trail, including unloaded content', () => {
  const s = setup({ previous: true });
  expect(s.send('a', { key: 'ArrowUp' })).toBe(true);
  expect(s.selectedItems).toEqual([['previousLast', 'previous']]);
  expect(s.selected).toEqual([]);
  expect(s.moves).toEqual([]);
});

test('Command+Option+Up stays put at the first note of the first trail', () => {
  const s = setup();
  s.send('a', { key: 'ArrowUp' });
  expect(s.selectedItems).toEqual([]);
  expect(s.selected).toEqual([]);
  expect(s.moves).toEqual([]);
});

test('Command+Option+Up can open an empty previous trail without selecting an invalid note', () => {
  const s = setup({ previous: true, emptyPrevious: true });
  s.send('a', { key: 'ArrowUp' });
  expect(s.selected).toEqual(['previous']);
  expect(s.selectedItems).toEqual([]);
});
