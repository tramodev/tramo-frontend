import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const lexical = require('lexical');
const code = require('@lexical/code');
const source = readFileSync('app/editor/[projectId]/components/WriteView.tsx', 'utf8')
  + '\nexport { ItemNavigationPlugin, ItemTitle, ItemEditorContent, isOnBoundaryLine, focusTitle };';

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
      if (name === 'react') return { useEffect: fn => fn(), useRef: value => ({ current: value }), useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === '@lexical/react/LexicalTypeaheadMenuPlugin') return { useBasicTypeaheadTriggerMatch: () => text => text.startsWith('/') ? { matchingString: text.slice(1) } : null };
      if (name === '@lexical/react/LexicalOnChangePlugin') return { OnChangePlugin: 'OnChange' };
      if (name === '../../plugins/SlashMenuPlugin') return { default: 'SlashMenu' };
      if (name === '@lexical/react/LexicalComposerContext') return { useLexicalComposerContext: () => [editor] };
      if (name === '@/app/editor/item-editor-session') return { restoreItemHistory: () => ({ current: null, undoStack: [], redoStack: [] }) };
      if (name === '@/app/editor/nodes/ImageNode') return { ImageNode: class { static getType() { return 'image'; } } };
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

test('focusing the note title selects the old name for replacement', () => {
  const s = setup();
  let selected = false;
  s.titleInput.props.onFocus({ currentTarget: { select: () => { selected = true; } } });
  expect(selected).toBe(true);
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

test('toolbar portal focus does not override the visible note selected by the scroll spy', () => {
  const s = setup(), selected = [];
  const node = s.exports.ItemEditorContent({
    item: { id: 'note', title: 'Note' }, props: { trails: [] }, session: { previewUrls: new Set() },
    onFocus: id => selected.push(id), onPendingImages() {}, focused: false,
  });
  const currentTarget = { contains: target => target === 'note-input' };
  node.props.onFocusCapture({ currentTarget, target: 'toolbar-button' });
  expect(selected).toEqual([]);
  node.props.onFocusCapture({ currentTarget, target: 'note-input' });
  expect(selected).toEqual(['note']);
});

test('zero-height caret rectangles use adjacent text geometry', () => {
  const s = setup();
  let reads = 0, expanded = false;
  s.range.getBoundingClientRect = () => ++reads === 1 ? { height: 0 } : { top: 0, bottom: 18, height: 18 };
  s.range.setEnd = () => { expanded = true; };
  expect(s.exports.isOnBoundaryLine(s.editor, -1)).toBe(true);
  expect(expanded).toBe(true);
});

test('Enter focuses the body before the next keystroke or animation frame', () => {
  const s = setup();
  let blurred = false;
  s.titleInput.props.onKeyDown({ key: 'Enter', nativeEvent: {}, currentTarget: { blur: () => { blurred = true; } }, preventDefault() {} });
  expect(blurred).toBe(true);
  expect(s.focused).toEqual(['content']);
  s.editor.update(() => lexical.$getSelection().insertText('ABC'), { discrete: true });
  expect(s.editor.getEditorState().read(() => lexical.$getRoot().getTextContent())).toMatch(/^ABC/);
});


test('draft changes defer creation while typing slash queries and flush after the menu closes', () => {
  const s = setup(), changes = [];
  const tree = s.exports.ItemEditorContent({
    item: { id: 'draft', title: '' }, props: { trails: [], draft: true, onChange: (...args) => changes.push(args) },
    session: { previewUrls: new Set() }, onFocus() {}, onPendingImages() {}, focused: false,
  });
  s.editor.update(() => {
    const text = lexical.$getRoot().getFirstDescendant();
    text.setTextContent('/e'); text.selectEnd();
  }, { discrete: true });
  const children = tree.props.children.flat();
  children.find(node => node?.type === 'OnChange').props.onChange(s.editor.getEditorState(), s.editor, new Set());
  expect(changes[0][2]).toBe(true);
  children.find(node => node?.type === 'SlashMenu').props.onClose();
  s.flush();
  expect(changes[1][2]).toBe(false);
});


test('opening and dirtying unchanged notes never save, while edits and undo do', () => {
  const s = setup(), saves = [];
  const node = s.exports.ItemEditorContent({
    item: { id: 'note', title: 'Note' }, props: { trails: [], onChange: (...args) => saves.push(args) },
    session: { previewUrls: new Set() }, onPendingImages() {}, focused: false,
  });
  const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
  const change = flatten(node).find(node => node.type === 'OnChange').props.onChange;
  change(s.editor.getEditorState(), s.editor, new Set());
  s.editor.update(() => lexical.$getRoot().getFirstDescendant().getWritable(), { discrete: true });
  change(s.editor.getEditorState(), s.editor, new Set());
  expect(saves).toHaveLength(0);
  const original = s.editor.getEditorState();
  s.editor.update(() => lexical.$getRoot().getFirstDescendant().setTextContent('edited'), { discrete: true });
  change(s.editor.getEditorState(), s.editor, new Set(['history-merge']));
  expect(saves).toHaveLength(1);
  change(s.editor.getEditorState(), s.editor, new Set());
  expect(saves).toHaveLength(1);
  change(original, s.editor, new Set());
  expect(saves).toHaveLength(2);
  change(s.editor.getEditorState(), s.editor, new Set(['extraction']));
  change(s.editor.getEditorState(), s.editor, new Set());
  expect(saves).toHaveLength(2);
  s.editor.update(() => lexical.$getRoot().getFirstDescendant().toggleFormat('bold'), { discrete: true });
  change(s.editor.getEditorState(), s.editor, new Set());
  expect(saves).toHaveLength(3);
});
