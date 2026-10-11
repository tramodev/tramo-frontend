import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
function load(path, modules, globals = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => modules[name] ?? {}, ...globals });
  return exports;
}
function hooks() {
  const states = [];
  let index = 0;
  return {
    reset: () => { index = 0; },
    useState: initial => {
      const slot = index++;
      if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial;
      return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }];
    },
    useRef: value => ({ current: value }), useMemo: fn => fn(), useCallback: fn => fn,
  };
}

test('the viewport window removes distant notes and remembers measured heights', () => {
  const react = hooks(), effects = [], observers = [], listeners = new Map();
  let selection;
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = []; observers.push(this); }
    observe(element) { this.targets.push(element); }
    disconnect() { this.disconnected = true; }
  }
  const virtual = load('app/editor/[projectId]/hooks/useVirtualNotes.ts', { react: { ...react, useEffect: fn => effects.push(fn) } }, {
    IntersectionObserver: Observer, ResizeObserver: Observer,
    window: { getSelection: () => selection },
    document: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) },
  });
  const root = { current: { contains: () => true } };
  const slots = { current: new Map(Array.from({ length: 100 }, (_, i) => [String(i), { dataset: { itemId: String(i), mounted: i === 0 ? 'true' : 'false' }, getBoundingClientRect: () => ({ height: 700 + i }) }])) };
  const ids = [...slots.current.keys()];
  const render = () => { react.reset(); return virtual.useVirtualNotes(root, slots, ids, true); };
  render();
  const selectionCleanup = effects.shift()();
  const cleanup = effects.shift()();
  const [intersection, resize] = observers;
  expect(intersection.options).toEqual({ root: root.current, rootMargin: '400px 0px' });
  expect(intersection.targets).toHaveLength(100);
  intersection.callback([{ target: slots.current.get('0'), isIntersecting: true }]);
  resize.callback([{ target: slots.current.get('0') }, { target: slots.current.get('99') }]);
  let result = render();
  expect([...result.visibleIds]).toEqual(['0']);
  expect(result.heights.get('0')).toBe(700);
  expect(result.heights.has('99')).toBe(false);
  intersection.callback([{ target: slots.current.get('0'), isIntersecting: false }, { target: slots.current.get('99'), isIntersecting: true }]);
  result = render();
  expect([...result.visibleIds]).toEqual(['99']);
  expect(result.heights.get('0')).toBe(700);
  selection = { isCollapsed: false, anchorNode: { parentElement: { closest: () => slots.current.get('0') } }, focusNode: { parentElement: { closest: () => slots.current.get('2') } } };
  listeners.get('selectionchange')();
  expect([...render().selectionIds]).toEqual(['0', '1', '2']);
  selection = { isCollapsed: true };
  listeners.get('selectionchange')();
  expect(render().selectionIds.size).toBe(0);
  cleanup();
  selectionCleanup();
  expect(observers.every(observer => observer.disconnected)).toBe(true);
});

test('scrolling through 100 notes does not accumulate editors; focus and uploads stay pinned', () => {
  const react = hooks();
  let visibleIds = new Set(['0', '1', '2']);
  const heights = new Map([['2', 930]]);
  const view = load('app/editor/[projectId]/components/WriteView.tsx', {
    react: { ...react, useEffect: () => {} },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    '@/hooks/use-scroll-spy': { useScrollSpy: () => {} },
    '@/app/editor/[projectId]/hooks/useVirtualNotes': { useVirtualNotes: () => ({ visibleIds, selectionIds: new Set(), heights }) },
  });
  const items = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [String(i), { id: String(i), title: `Note ${i}`, content: '' }]));
  const trail = { id: 'trail', itemIds: Object.keys(items), steps: Object.keys(items).map(itemId => ({ itemId })) };
  let props = { item: items['0'], items, trail, trails: [trail], onVisibleItem() {} };
  const render = changes => { props = { ...props, ...changes }; react.reset(); return flatten(view.WriteView(props)); };
  const mounted = nodes => nodes.filter(node => node.type?.name === 'ItemEditor');
  let nodes = render();
  expect(mounted(nodes).map(node => node.props.item.id)).toEqual(['0', '1', '2']);
  mounted(nodes)[2].props.onPendingImages('2', true);
  visibleIds = new Set(['97', '98', '99']);
  nodes = render({ item: items['98'] });
  expect(mounted(nodes).map(node => node.props.item.id)).toEqual(['0', '2', '97', '98', '99']);
  mounted(nodes).find(node => node.props.item.id === '98').props.onFocus('98');
  mounted(nodes)[0].props.onPendingImages('2', false);
  nodes = render();
  expect(mounted(nodes).map(node => node.props.item.id)).toEqual(['97', '98', '99']);
  expect(nodes.find(node => node.props['data-item-id'] === '2').props.style.height).toBe(930);
  visibleIds = new Set(['0', '1', '2']);
  nodes = render({ item: items['0'] });
  expect(mounted(nodes).map(node => node.props.item.id)).toEqual(['0', '1', '2', '98']);
  nodes = render({ item: items['75'], navigationRequest: { itemId: '75', sequence: 1, focus: true } });
  expect(mounted(nodes).some(node => node.props.item.id === '75')).toBe(true);
});
