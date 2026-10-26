import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup(reduced = false) {
  const frames = new Map(), animated = [], cancelled = [];
  let frameId = 0, handler, cleanup, rootTop = 100;
  const root = { children: [], getBoundingClientRect: () => ({ top: rootTop }) };
  const blocks = [0, 40, 80].map((top, index) => ({
    top, textContent: `paragraph ${index}`, parentElement: root,
    getBoundingClientRect() { return { top: rootTop + this.top }; },
    animate(keyframes, options) {
      animated.push({ index, keyframes, options });
      return { cancel: () => cancelled.push(index) };
    },
  }));
  root.children = [...blocks];
  const editor = { getRootElement: () => root, registerCommand: () => () => {} };
  const anchor = { addEventListener: (_type, fn, capture) => { expect(capture).toBe(true); handler = fn; }, removeEventListener: () => {} };
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/DraggableBlockPlugin.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    window: { matchMedia: () => ({ matches: reduced }) },
    requestAnimationFrame: fn => { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    require: name => ({
      lexical: { createCommand: () => ({}) },
      '@lexical/utils': { mergeRegister: (...callbacks) => () => callbacks.forEach(fn => fn()) },
      react: { useRef: value => ({ current: value }), useEffect: fn => { cleanup = fn(); } },
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
      '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [editor] },
    })[name] ?? {},
  });
  exports.default({ anchorElem: anchor });
  return { animated, cancelled, blocks, root, editor, cleanup,
    drop: (types = ['application/x-lexical-drag-block']) => handler({ dataTransfer: { types } }),
    reorder: () => { root.children = [blocks[1], blocks[0], blocks[2]]; blocks[0].top = 40; blocks[1].top = 0; },
    scroll: () => { rootTop -= 50; },
    flush: () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); } };
}

test('reordering animates only displaced blocks without editing their content', () => {
  const s = setup();
  s.drop(); s.reorder(); s.flush();
  expect(s.animated).toEqual([
    { index: 0, keyframes: [{ transform: 'translateY(-40px)' }, { transform: 'translateY(0)' }], options: { duration: 180, easing: 'ease-out' } },
    { index: 1, keyframes: [{ transform: 'translateY(40px)' }, { transform: 'translateY(0)' }], options: { duration: 180, easing: 'ease-out' } },
  ]);
  expect(s.blocks.map(block => block.textContent)).toEqual(['paragraph 0', 'paragraph 1', 'paragraph 2']);
});

test('file drops, unchanged order, scrolling and reduced motion do not animate blocks', () => {
  const files = setup(); files.drop(['Files']); files.reorder(); files.flush();
  expect(files.animated).toEqual([]);
  const unchanged = setup(); unchanged.drop(); unchanged.scroll(); unchanged.flush();
  expect(unchanged.animated).toEqual([]);
  const reduced = setup(true); reduced.drop(); reduced.reorder(); reduced.flush();
  expect(reduced.animated).toEqual([]);
});

test('scrolling during a reorder does not affect the animation offsets', () => {
  const s = setup(); s.drop(); s.reorder(); s.scroll(); s.flush();
  expect(s.animated[0].keyframes[0].transform).toBe('translateY(-40px)');
});

test('unmount cancels pending frames and existing animations', () => {
  const pending = setup(); pending.drop(); pending.reorder(); pending.cleanup(); pending.flush();
  expect(pending.animated).toEqual([]);
  const active = setup(); active.drop(); active.reorder(); active.flush(); active.cleanup();
  expect(active.cancelled).toEqual([0, 1]);
});

test('a replaced editor root is not animated', () => {
  const s = setup(); s.drop(); s.reorder(); s.editor.getRootElement = () => null; s.flush();
  expect(s.animated).toEqual([]);
});

test('menu opening and drag-handle transitions have reduced-motion overrides', () => {
  const css = readFileSync('app/editor/Editor.css', 'utf8');
  expect(css).toContain('transition: transform 140ms ease-in-out, opacity 160ms ease-in-out');
  expect(css).toContain('animation: editor-menu-in 150ms ease-out');
  expect(css).toMatch(/\.item-mention-menu,\s*\[data-item-connection-popover\]\s*\{\s*transform-origin: top left;\s*animation: editor-menu-in/);
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.draggable-block-menu,[\s\S]*?transition: none;[\s\S]*?\.item-mention-menu,\s*\[data-item-connection-popover\]\s*\{\s*animation: none;/);
});
