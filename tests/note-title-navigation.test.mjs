import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const lexical = require('lexical');
const code = require('@lexical/code');
const source = readFileSync('app/editor/[projectId]/components/WriteView.tsx', 'utf8')
  + '\nexport { ItemNavigationPlugin, ItemTitle, isOnBoundaryLine, focusTitle };';

function setup({ offset = 4, caretTop = 0, lines = [0, 24, 48], empty = false, codeBlock = false, emptyListbox = false } = {}) {
  const frames = [], moves = [], saves = [], focused = [];
  let menu = false, composing = false;
  const rect = top => ({ top, bottom: top + 18, height: 18 });
  const title = { value: 'Title', focus: () => focused.push('title'), setSelectionRange: (...args) => focused.push(args), scrollIntoView: () => {} };
  const rootElement = {
    contains: () => true, firstElementChild: {}, lastElementChild: {},
    closest: () => ({ querySelector: () => title }), focus: () => focused.push('content'),
  };
  const editor = lexical.createEditor({ namespace: 'test', nodes: [code.CodeNode], onError: error => { throw error; } });
  editor._headless = true;
  editor.update(() => {
    const block = codeBlock ? code.$createCodeNode() : lexical.$createParagraphNode();
    if (empty) block.select();
    else block.append(lexical.$createTextNode('first line\nsecond line\nlast line')).getFirstChild().select(offset, offset);
    lexical.$getRoot().append(block);
  }, { discrete: true });
  editor.getRootElement = () => rootElement;
  editor.isComposing = () => composing;
  const range = {
    startContainer: { nodeType: 3, textContent: 'text', parentElement: { getBoundingClientRect: () => rect(caretTop) } },
    startOffset: 1, cloneRange() { return this; }, getBoundingClientRect: () => rect(caretTop), setEnd() {}, setStart() {},
  };
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 }, requestAnimationFrame: fn => frames.push(fn),
    window: { getSelection: () => ({ isCollapsed: true, rangeCount: 1, anchorNode: {}, getRangeAt: () => range }) },
    document: { querySelector: selector => menu || emptyListbox && selector.includes('[role="listbox"]') && !selector.includes('[role="listbox"]:not(:empty)') ? {} : null, createRange: () => ({ selectNodeContents() {}, getClientRects: () => lines.map(rect) }) },
    require: name => {
      if (name === 'react') return { useEffect: fn => fn(), useRef: value => ({ current: value }) };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === '@lexical/react/LexicalComposerContext') return { useLexicalComposerContext: () => [editor] };
      if (name === 'lexical' || name === '@lexical/utils') return require(name);
      return {};
    },
  });
  let hasNext = true;
  const move = (...args) => { moves.push(args); return hasNext; };
  exports.ItemNavigationPlugin({ itemId: 'note', register: () => {}, move });
  const titleInput = exports.ItemTitle({ item: { id: 'note', title: 'Title' }, onCommitTitle: (...args) => saves.push(args), onFocus: () => {}, move }).props.children;
  function arrow(direction, overrides = {}) {
    let prevented = false, handled;
    const event = { target: { closest: () => null }, preventDefault: () => { prevented = true; }, ...overrides };
    editor.update(() => { handled = editor.dispatchCommand(direction === -1 ? lexical.KEY_ARROW_UP_COMMAND : lexical.KEY_ARROW_DOWN_COMMAND, event); }, { discrete: true });
    return { handled, prevented };
  }
  function titleArrow(key, overrides = {}) {
    let prevented = false;
    titleInput.props.onKeyDown({ key, currentTarget: { selectionStart: 3, selectionEnd: 3 }, nativeEvent: {}, preventDefault: () => { prevented = true; }, ...overrides });
    return prevented;
  }
  return { editor, exports, range, moves, saves, focused, titleInput, arrow, titleArrow,
    flush: () => { while (frames.length) frames.shift()(); },
    menu: () => { menu = true; }, composing: () => { composing = true; }, noNext: () => { hasNext = false; } };
}

test('up from the first visual line focuses the start of the current title without editing content', () => {
  const s = setup();
  const before = s.editor.getEditorState().toJSON();
  expect(s.arrow(-1)).toEqual({ handled: true, prevented: true });
  s.flush();
  expect(s.focused).toEqual(['title', [0, 0]]);
  expect(s.moves).toEqual([]);
  expect(s.editor.getEditorState().toJSON()).toEqual(before);
});

test('down from anywhere on the last visual line requests the next title', () => {
  const s = setup({ caretTop: 48 });
  expect(s.arrow(1)).toEqual({ handled: true, prevented: true });
  expect(s.moves).toEqual([['note', 1, true]]);
});

test('focusing another note title also places the caret at the start', () => {
  const s = setup();
  s.exports.focusTitle(s.editor);
  expect(s.focused).toEqual(['title', [0, 0]]);
});

test('middle visual lines and non-boundary paragraphs keep native arrow navigation', () => {
  const s = setup({ caretTop: 24 });
  expect(s.arrow(-1).handled).toBe(false);
  expect(s.arrow(1).handled).toBe(false);
  s.editor.update(() => {
    lexical.$getRoot().append(lexical.$createParagraphNode().append(lexical.$createTextNode('next')));
  }, { discrete: true });
  expect(s.arrow(1).handled).toBe(false);
  expect(s.moves).toEqual([]);
});

test('title down enters content, title up requests the previous content, and blur still saves edits', () => {
  const s = setup();
  expect(s.titleArrow('ArrowDown')).toBe(true);
  s.flush();
  expect(s.focused).toEqual(['content']);
  expect(s.titleArrow('ArrowUp')).toBe(true);
  expect(s.moves).toEqual([['note', -1]]);
  s.titleInput.props.onBlur({ target: { value: 'Changed' } });
  expect(s.saves).toEqual([['note', 'Title', 'Changed']]);
});

test('missing adjacent notes do not consume arrows', () => {
  const s = setup({ caretTop: 48 });
  s.noNext();
  expect(s.arrow(1)).toEqual({ handled: false, prevented: false });
  expect(s.titleArrow('ArrowUp')).toBe(false);
});

test.each(['altKey', 'metaKey', 'ctrlKey', 'shiftKey'])('%s keeps existing keyboard behavior', modifier => {
  const s = setup();
  expect(s.arrow(-1, { [modifier]: true }).handled).toBe(false);
  expect(s.titleArrow('ArrowDown', { [modifier]: true })).toBe(false);
  expect(s.titleArrow('ArrowUp', { [modifier]: true })).toBe(false);
});

test('selections, IME composition, menus and code blocks do not jump to titles', () => {
  const selected = setup();
  selected.editor.update(() => lexical.$getRoot().getFirstDescendant().select(1, 4), { discrete: true });
  expect(selected.arrow(-1).handled).toBe(false);
  expect(selected.titleArrow('ArrowDown', { currentTarget: { selectionStart: 1, selectionEnd: 4 } })).toBe(false);
  const ime = setup(); ime.composing();
  expect(ime.arrow(-1).handled).toBe(false);
  expect(ime.titleArrow('ArrowDown')).toBe(false);
  const menu = setup(); menu.menu();
  expect(menu.arrow(-1).handled).toBe(false);
  expect(menu.titleArrow('ArrowDown')).toBe(false);
  expect(setup({ codeBlock: true }).arrow(-1).handled).toBe(false);
});

test('empty notes can navigate in both directions', () => {
  const s = setup({ empty: true, lines: [0] });
  expect(s.arrow(-1).handled).toBe(true);
  expect(s.arrow(1).handled).toBe(true);
});

test('empty typeahead containers do not block note navigation', () => {
  const s = setup({ emptyListbox: true });
  expect(s.arrow(-1).handled).toBe(true);
  expect(s.titleArrow('ArrowDown')).toBe(true);
});

test('zero-height caret rectangles use adjacent text geometry', () => {
  const s = setup();
  let reads = 0, expanded = false;
  s.range.getBoundingClientRect = () => ++reads === 1 ? { height: 0 } : { top: 0, bottom: 18, height: 18 };
  s.range.setEnd = () => { expanded = true; };
  expect(s.exports.isOnBoundaryLine(s.editor, -1)).toBe(true);
  expect(expanded).toBe(true);
});
