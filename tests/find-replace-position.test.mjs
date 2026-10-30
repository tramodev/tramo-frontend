import { expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

function setup(connectionsOpen = false) {
  const states = [], refs = [], effects = [], observers = [], commands = new Map(), listeners = new Map();
  let state = 0, ref = 0, cleanups = [];
  let viewportRect = { top: 120, right: connectionsOpen ? 1152 : 1392 };
  let columnRect = { right: connectionsOpen ? 1000 : 1120 };
  const viewport = { getBoundingClientRect: () => viewportRect };
  const column = { getBoundingClientRect: () => columnRect };
  const root = { focus: jest.fn(), closest: selector => ({
    '.editor-inner': viewport, '.editor-content-column': column, '.editor-container': { contains: target => target === root },
  })[selector] ?? null };
  const editor = {
    getRootElement: () => root,
    getEditorState: () => ({ read: fn => fn() }),
    registerCommand: (command, handler) => { commands.set(command, handler); return () => commands.delete(command); },
  };
  const window = {
    innerWidth: 1440,
    addEventListener: (type, handler) => listeners.set(type, handler),
    removeEventListener: (type, handler) => { if (listeners.get(type) === handler) listeners.delete(type); },
  };
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
    observe(target) { this.targets.push(target); }
    disconnect() { this.disconnected = true; }
  }
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/FindReplacePlugin.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, window, document: { body: {} }, ResizeObserver, requestAnimationFrame() {},
    require: name => ({
      react: {
        useState: initial => { const i = state++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; },
        useRef: initial => refs[ref++] ??= { current: initial }, useCallback: fn => fn,
        useEffect: effect => effects.push(effect),
      },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'react-dom': { createPortal: node => node },
      '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [editor] },
      lexical: { createCommand: name => name, $getRoot: () => ({ getFirstChild: () => null }) },
    })[name] ?? {},
  });
  function render() {
    cleanups.forEach(cleanup => cleanup?.());
    state = ref = effects.length = 0;
    const tree = exports.default();
    cleanups = effects.map(effect => effect());
    return tree;
  }
  render();
  return {
    render, observers, listeners, root, viewport, column, window,
    open: () => { commands.get(exports.OPEN_FIND_REPLACE_COMMAND)(); return render(); },
    resizePanel(open) {
      viewportRect = { top: 120, right: open ? 1152 : 1392 };
      columnRect = { right: open ? 1000 : 1120 };
      observers.at(-1).callback();
      return render();
    },
    resizeWindow() {
      window.innerWidth = 1280;
      viewportRect = { top: 90, right: 1232 };
      columnRect = { right: 1040 };
      listeners.get('resize')();
      return render();
    },
    unmount: () => cleanups.forEach(cleanup => cleanup?.()),
  };
}

test.each([false, true])('opening find aligns with the text column, connections open: %s', open => {
  const s = setup(open);
  expect(s.observers).toHaveLength(0);
  const bar = s.open();
  expect(bar.props.style).toEqual({ top: 128, right: open ? 448 : 328, maxWidth: `calc(100vw - ${open ? 456 : 336}px)` });
  expect(s.observers.at(-1).targets).toEqual([s.viewport, s.column]);
});

test('opening and closing connections moves the existing bar without clearing the search', () => {
  const s = setup();
  const bar = s.open();
  flatten(bar).find(node => node.props.placeholder === 'Find').props.onChange({ target: { value: 'needle' } });
  expect(s.resizePanel(true).props.style.right).toBe(448);
  const closed = s.resizePanel(false);
  expect(closed.props.style.right).toBe(328);
  expect(flatten(closed).find(node => node.props.placeholder === 'Find').props.value).toBe('needle');
});

test('window resizing updates both the viewport offset and the column alignment', () => {
  const s = setup();
  s.open();
  expect(s.resizeWindow().props.style).toEqual({ top: 98, right: 248, maxWidth: 'calc(100vw - 256px)' });
});

test('closing find disconnects layout observation and restores focus to the editor', () => {
  const s = setup();
  const bar = s.open();
  flatten(bar).find(node => node.props['aria-label'] === 'Close find and replace').props.onClick();
  expect(s.render()).toBeNull();
  expect(s.observers.every(observer => observer.disconnected)).toBe(true);
  expect(s.listeners.has('resize')).toBe(false);
  expect(s.root.focus).toHaveBeenCalledWith({ preventScroll: true });
});

test('leaving the editor removes the resize and keyboard listeners', () => {
  const s = setup();
  s.open();
  s.unmount();
  expect(s.observers.at(-1).disconnected).toBe(true);
  expect(s.listeners.size).toBe(0);
});
