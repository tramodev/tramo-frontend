import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const modules = {};
function load(path, overrides, suffix = '', globals = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8') + suffix, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => overrides[name] ?? modules[name] ?? (name.startsWith('@/') ? {} : require(name)), ...globals });
  return exports;
}
modules['@/app/editor/embed-validity'] = load('app/editor/embed-validity.ts', { '@/app/editor/plugins/music-audio': { loadAbcjs: () => Promise.resolve(require('abcjs')) } });
function find(element, type) {
  if (!element || typeof element !== 'object') return;
  if (element.type === type) return element;
  return [element.props?.children].flat().map(child => find(child, type)).find(Boolean);
}
function setup(kind, initial = '', fresh = initial === '', selected = false, scoreLoad, editable = true) {
  const field = kind === 'Equation' ? 'equation' : 'abc';
  const states = [], effects = [], listeners = [], refs = [], updates = [], callbacks = [], effectStates = [];
  let index = 0, refIndex = 0, callbackIndex = 0, effectIndex = 0, content = initial, removed = false;
  const changed = (previous, next) => !previous || !next || previous.length !== next.length || previous.some((value, i) => value !== next[i]);
  const node = { setEquation: value => { content = value; }, setAbc: value => { content = value; }, getEquation: () => content, getAbc: () => content, remove: () => { removed = true; } };
  const editor = { isEditable: () => editable, update: (fn, options) => { updates.push(options); fn(); }, registerCommand: () => () => {}, registerUpdateListener: listener => { listeners.push(listener); return () => {}; } };
  const editingDecorators = new WeakMap([[editor, new Set(fresh ? ['embed'] : [])]]);
  const react = {
    useState: initial => { const i = index++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = value; }]; },
    useRef: value => refs[refIndex++] ??= { current: value },
    useCallback: (fn, deps) => { const i = callbackIndex++; if (changed(callbacks[i]?.deps, deps)) callbacks[i] = { fn, deps }; return callbacks[i].fn; },
    useEffect: (fn, deps) => { const i = effectIndex++; if (changed(effectStates[i]?.deps, deps)) effects.push(() => { effectStates[i]?.cleanup?.(); effectStates[i] = { deps, cleanup: fn() }; }); },
    useLayoutEffect() {},
  };
  const events = new Map();
  const actions = [];
  editor.getRootElement = () => ({ focus: () => actions.push('root-focus') });
  editor.focus = () => actions.push('editor-focus');
  class Element {
    constructor(tag = 'button') { this.tag = tag; }
    closest(selector) { return selector.split(', ').includes(this.tag) ? this : null; }
    focus() { actions.push('focus'); }
    click() { actions.push('click'); }
  }
  const { useEmbedDraftExit } = load('app/editor/plugins/useEmbedDraftExit.tsx', {
    react: { ...react, useLayoutEffect: react.useEffect },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [editor] },
    '@/components/shared/confirm-dialog': { ConfirmDialog: 'ConfirmDialog' },
  }, '', { document: { addEventListener: (type, fn) => events.set(type, fn), removeEventListener: type => events.delete(type) }, Element, requestAnimationFrame: fn => fn() });
  const component = load(`app/editor/plugins/${kind}Component.tsx`, {
    react,
    '@/app/editor/plugins/useEmbedDraftExit': { useEmbedDraftExit },
    '@/app/editor/embed-draft-status': { setPendingEmbedDraft() {} },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [editor] },
    '@lexical/react/useLexicalNodeSelection': { useLexicalNodeSelection: () => [selected, () => {}, () => {}] },
    katex: { default: require('katex') },
    lexical: { $getNodeByKey: () => node, HISTORIC_TAG: 'historic', HISTORY_PUSH_TAG: 'history-push', HISTORY_MERGE_TAG: 'history-merge' },
    [`@/app/editor/nodes/${kind}Node`]: { [`$is${kind}Node`]: value => value === node },
    '@/app/editor/plugins/decoratorCaret': { editingDecorators },
    '@/app/editor/plugins/music-audio': { loadAbcjs: () => scoreLoad ?? Promise.resolve(require('abcjs')) },
    '@/app/editor/plugins/MusicPlugin': { DEFAULT_ABC: 'X:1\nK:C\n' },
  }, '', { setTimeout: fn => { fn(); return 0; }, clearTimeout() {}, window: { addEventListener() {}, removeEventListener() {} } }).default;
  const render = () => { index = refIndex = callbackIndex = effectIndex = 0; const tree = component({ [field]: content, inline: false, nodeKey: 'embed' }); effects.splice(0).forEach(fn => fn()); return tree; };
  const input = () => find(render(), 'textarea');
  return {
    input, render, updates, actions, get warnings() { return states[2]; },
    dialog: () => find(render(), 'ConfirmDialog'),
    clickOutside: async (pointer = true, tag = 'button') => {
      render();
      let prevented = false;
      const event = { target: new Element(tag), preventDefault() { prevented = true; }, stopImmediatePropagation() {} };
      if (pointer) events.get('pointerdown')?.(event);
      events.get('click')?.(event);
      await new Promise(resolve => setImmediate(resolve));
      return prevented;
    },
    blur: async () => { find(render(), kind === 'Equation' ? 'span' : 'div').props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: null }); await new Promise(resolve => setImmediate(resolve)); },
    restore: value => { content = value; listeners.forEach(fn => fn({ editorState: { read: fn => fn() }, tags: new Set(['historic']) })); },
    edit: () => find(render(), 'button').props.onClick({ stopPropagation() {} }),
    enter: () => find(render(), kind === 'Equation' ? 'span' : 'div').props.onDoubleClick(),
    type: value => input().props.onChange({ target: { value } }),
    escape: () => input().props.onKeyDown({ key: 'Escape', currentTarget: { value: content, selectionStart: 0, selectionEnd: 0 }, stopPropagation() {}, preventDefault() {} }),
    get content() { return content; }, get removed() { return removed; },
  };
}

test.each(['Equation', 'Music'])('%s preserves a new unfinished source on Escape without a dialog', async kind => {
  const s = setup(kind);
  const source = kind === 'Equation' ? '\\frac{1}{' : 'X:1\nK:C\nCDE [';
  s.type(source);
  s.escape();
  await new Promise(resolve => setImmediate(resolve));
  expect(s.removed).toBe(false);
  expect(s.content).toBe(source);
  expect(s.dialog()).toBeUndefined();
  expect(s.input()).toBeUndefined();
});

test.each(['Equation', 'Music'])('%s saves changed invalid source on Escape', async kind => {
  const s = setup(kind, 'original');
  s.enter();
  s.type('original + changes');
  s.escape();
  await new Promise(resolve => setImmediate(resolve));
  expect(s.content).toBe('original + changes');
  expect(s.removed).toBe(false);
  expect(s.dialog()).toBeUndefined();
});

test.each(['Equation', 'Music'])('%s closes an oversized draft while showing its count and error', async kind => {
  const s = setup(kind);
  const oversized = 'x'.repeat(10001);
  s.type(oversized);
  const tree = s.render();
  const elements = element => !element || typeof element !== 'object' ? [] : [element, ...[element.props?.children].flat().flatMap(elements)];
  expect(find(tree, 'textarea').props['aria-invalid']).toBe(true);
  expect(elements(tree).find(element => element.props?.role === 'status').props.children.join('')).toContain('10,001/10,000');
  expect(elements(tree).find(element => element.props?.role === 'alert').props.children).toContain('Shorten');
  s.escape();
  await new Promise(resolve => setImmediate(resolve));
  expect(s.input()).toBeUndefined();
  expect(s.content).toBe(oversized);
});

test.each(['Equation', 'Music'])('%s removes an explicitly finished empty embed', kind => {
  const s = setup(kind);
  s.type('');
  s.escape();
  expect(s.removed).toBe(true);
});

test.each([['Equation', true], ['Equation', false], ['Music', true], ['Music', false]])('%s preserves invalid source and resumes Share (pointer: %s)', async (kind, pointer) => {
  const original = kind === 'Equation' ? 'x + y' : 'X:1\nK:C\nCDEF|';
  const invalid = kind === 'Equation' ? '\\frac{1}{' : 'X:1\nK:C\nCDE [';
  const s = setup(kind, original);
  s.enter();
  s.type(invalid);
  expect(await s.clickOutside(pointer)).toBe(true);
  expect(s.content).toBe(invalid);
  expect(s.removed).toBe(false);
  expect(s.dialog()).toBeUndefined();
  expect(s.input()).toBeUndefined();
  expect(s.actions).toEqual(['focus', 'click']);
});

test.each(['Equation', 'Music'].flatMap(kind => ['input', 'textarea', 'select'].map(tag => [kind, tag])))('%s resumes focus on an outside %s after saving valid or invalid source', async (kind, tag) => {
  const value = kind === 'Equation' ? 'x + y' : 'X:1\nK:C\nCDEF|';
  const invalid = kind === 'Equation' ? '\\frac{1}{' : 'X:1\nK:C\nCDE [';
  for (const pointer of [true, false]) {
    for (const draft of [kind === 'Equation' ? 'z' : 'X:1\nK:C\nGABc|', invalid]) {
      const s = setup(kind, value);
      s.enter();
      s.type(draft);
      expect(await s.clickOutside(pointer, tag)).toBe(true);
      expect(s.content).toBe(draft);
      expect(s.dialog()).toBeUndefined();
      expect(s.input()).toBeUndefined();
      expect(s.actions).toEqual(['focus', 'click']);
    }
  }
});

test.each(['Equation', 'Music'])('%s keeps a new invalid embed when navigating away', async kind => {
  const s = setup(kind);
  const source = kind === 'Equation' ? '\\frac{1}{' : 'X:1\nK:C\nCDE [';
  s.type(source);
  await s.clickOutside();
  expect(s.dialog()).toBeUndefined();
  expect(s.removed).toBe(false);
  expect(s.content).toBe(source);
  expect(s.actions).toEqual(['focus', 'click']);
});

test.each(['Equation', 'Music'])('%s automatically confirms a valid draft before resuming the outside action', async kind => {
  const s = setup(kind);
  const value = kind === 'Equation' ? 'x + y' : 'X:1\nK:C\nCDEF|';
  s.type(value);
  await s.clickOutside();
  expect(s.content).toBe(value);
  expect(s.input()).toBeUndefined();
  expect(s.actions).toEqual(['focus', 'click']);
});

test('toolbar registers visible controls with Radix roving focus and excludes the upload input', () => {
  const React = require('react');
  const pass = ({ children }) => children;
  const ui = Object.fromEntries(['DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuItem', 'DropdownMenuShortcut', 'DropdownMenuSub', 'DropdownMenuSubTrigger'].map(name => [name, pass]));
  const Toolbar = load('app/editor/plugins/ToolbarPlugin.tsx', {
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [{}] },
    '@/components/ui/dropdown-menu': { ...ui, DropdownMenuContent: () => null, DropdownMenuSubContent: () => null },
    '@/components/ui/tooltip': { Tooltip: pass, TooltipTrigger: pass, TooltipContent: () => null },
    './ImagesPlugin': {}, './FloatingLinkEditorPlugin': {}, './FindReplacePlugin': {}, './EquationsPlugin': {}, './MusicPlugin': {},
  }).default;
  const html = require('react-dom/server').renderToStaticMarkup(React.createElement(Toolbar));
  const controls = html.match(/<(?:button|select|input)\b[^>]*>/g);
  expect(controls.length).toBeGreaterThan(15);
  for (const control of controls) {
    if (control.includes('type="file"')) {
      expect(control).not.toContain('data-radix-collection-item');
      expect(control).toContain('tabindex="-1"');
    } else {
      expect(control).toContain('data-radix-collection-item');
      expect(control).toContain('tabindex="-1"');
    }
  }
});

const { INLINE_EQUATION, BLOCK_EQUATION } = load('app/editor/plugins/markdownTransformers.ts', {
  '../nodes/EquationNode': { EquationNode: class {} },
});
test.each(['Cuesta $5 o $10', '$5$', '$ x $', '\\$x$'])('currency and escaped dollars stay text: %s', text => {
  expect(INLINE_EQUATION.regExp.test(text)).toBe(false);
});
test.each(['$x$', '$x + y$', '$\\frac{a}{b}$'])('math still converts: %s', text => {
  expect(INLINE_EQUATION.regExp.test(text)).toBe(true);
});
test('numeric block equations still convert', () => {
  expect(BLOCK_EQUATION.regExp.test('$$123$$')).toBe(true);
});


test('invalid equations render their source with an explanation instead of an error element', () => {
  const { renderKatex } = load('app/editor/plugins/EquationComponent.tsx', {
    '@/app/editor/nodes/EquationNode': {},
    '@/app/editor/plugins/decoratorCaret': {},
    katex: { default: { render: () => { throw new Error('KaTeX parse error: expected closing brace'); } } },
  }, '\nexport { renderKatex };');
  const target = { removeAttribute() {}, textContent: '', title: '' };
  expect(renderKatex(target, '\\frac{a', false)).toBe('expected closing brace');
  expect(target.textContent).toBe('\\frac{a');
  expect(target.title).toBe('expected closing brace');
});

test.each(['Inline equation', 'Equation', 'Music score'])('toolbar waits for menu close before inserting %s', label => {
  const frames = [], commands = [];
  const ui = Object.fromEntries(['DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuShortcut', 'DropdownMenuSub', 'DropdownMenuSubContent', 'DropdownMenuSubTrigger', 'DropdownMenuTrigger'].map(name => [name, name]));
  const Toolbar = load('app/editor/plugins/ToolbarPlugin.tsx', {
    react: { useState: value => [typeof value === 'function' ? value() : value, () => {}], useRef: value => ({ current: value }), useCallback: fn => fn, useEffect() {} },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [{ dispatchCommand: (...args) => commands.push(args) }] },
    '@/components/ui/dropdown-menu': ui,
    '@/components/ui/tooltip': { Tooltip: 'Tooltip', TooltipContent: 'TooltipContent', TooltipTrigger: 'TooltipTrigger' },
    './ImagesPlugin': {}, './FloatingLinkEditorPlugin': {}, './FindReplacePlugin': {},
    './EquationsPlugin': { INSERT_EQUATION_COMMAND: 'equation' }, './MusicPlugin': { INSERT_MUSIC_COMMAND: 'music' },
    '@/app/editor/plugins/EmbedsPlugin': {},
  }, '', { requestAnimationFrame: fn => frames.push(fn) }).default;
  const tree = Toolbar({});
  function elements(element) {
    if (!element || typeof element !== 'object') return [];
    return [element, ...[element.props?.children].flat().flatMap(elements)];
  }
  const nodes = elements(tree);
  const item = nodes.find(node => node.type === 'DropdownMenuItem' && [node.props.children].flat().includes(label));
  item.props.onSelect();
  expect(commands).toHaveLength(0);
  let prevented = false;
  nodes.find(node => node.props?.onCloseAutoFocus).props.onCloseAutoFocus({ preventDefault: () => { prevented = true; } });
  expect(prevented).toBe(true);
  expect(commands).toHaveLength(0);
  frames.shift()();
  expect(commands).toEqual(label === 'Music score' ? [['music', undefined]] : [['equation', { equation: '', inline: label === 'Inline equation' }]]);
});


test('toolbar moves secondary formatting into a menu when its container narrows', () => {
  const states = [], effects = [], refs = [];
  let index = 0, refIndex = 0, resize, observed, disconnected = false;
  const container = {};
  const Toolbar = load('app/editor/plugins/ToolbarPlugin.tsx', {
    react: {
      useState: initial => { const i = index++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = value; }]; },
      useRef: initial => refs[refIndex++] ??= { current: initial }, useCallback: fn => fn, useEffect: fn => effects.push(fn),
    },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [{}] },
    'radix-ui': { Toolbar: { Root: 'ToolbarRoot', Button: 'ToolbarButton' }, Popover: { Root: 'PopoverRoot', Trigger: 'PopoverTrigger', Portal: 'PopoverPortal', Content: 'PopoverContent' } },
    './ImagesPlugin': {}, './FloatingLinkEditorPlugin': {}, './FindReplacePlugin': {}, './EquationsPlugin': {}, './MusicPlugin': {},
  }, '', {
    ResizeObserver: class {
      constructor(callback) { resize = callback; }
      observe(target) { observed = target; }
      disconnect() { disconnected = true; }
    },
  }).default;
  const render = () => { index = refIndex = 0; effects.length = 0; return Toolbar({}); };
  const elements = element => !element || typeof element !== 'object' ? [] : [element, ...[element.props?.children].flat().flatMap(elements)];
  render().props.ref.current = { parentElement: container };
  const cleanup = effects[0]();
  expect(observed).toBe(container);
  resize([{ contentRect: { width: 375 } }]);
  let tree = render();
  expect(tree.props.className).toContain('toolbar-compact');
  const popup = find(tree, 'PopoverContent');
  expect(elements(popup).find(node => node.props?.['aria-label'] === 'Additional text formatting').props.loop).toBe(true);
  expect(elements(popup).some(node => node.props?.['aria-label'] === 'Font Family')).toBe(true);
  expect(elements(popup).some(node => node.props?.label === 'Format Bold')).toBe(false);
  for (const label of ['Undo', 'Redo', 'Format Bold', 'Insert Link', 'Insert']) {
    expect(elements(tree).some(node => node.props?.label === label && !elements(popup).includes(node))).toBe(true);
  }
  resize([{ contentRect: { width: 1200 } }]);
  tree = render();
  expect(tree.props.className).toBe('toolbar');
  expect(find(tree, 'PopoverContent')).toBeUndefined();
  expect(elements(tree).some(node => node.props?.['aria-label'] === 'Font Family')).toBe(true);
  cleanup();
  expect(disconnected).toBe(true);
});

test('font changes preserve DOM focus inside a looping toolbar', () => {
  const updates = [], styles = [];
  const selection = {};
  const Toolbar = load('app/editor/plugins/ToolbarPlugin.tsx', {
    react: { useState: value => [typeof value === 'function' ? value() : value, () => {}], useRef: value => ({ current: value }), useCallback: fn => fn, useEffect() {} },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [{ update: (fn, options) => { updates.push(options); fn(); } }] },
    lexical: { $getSelection: () => selection, $isRangeSelection: value => value === selection, SKIP_DOM_SELECTION_TAG: 'skip-dom-selection' },
    '@lexical/selection': { $patchStyleText: (...args) => styles.push(args) },
    './ImagesPlugin': {}, './FloatingLinkEditorPlugin': {}, './FindReplacePlugin': {}, './EquationsPlugin': {}, './MusicPlugin': {},
  }).default;
  const tree = Toolbar({});
  const font = find(tree, 'select');
  const input = find(tree, 'input');
  font.props.onChange({ target: { value: 'Georgia' } });
  input.props.onBlur({ target: { value: '24' } });
  expect(styles).toEqual([[selection, { 'font-family': 'Georgia' }], [selection, { 'font-size': '24px' }]]);
  expect(updates).toEqual([{ tag: 'skip-dom-selection' }, { tag: 'skip-dom-selection' }]);
  expect(tree.props.loop).toBe(true);
});

test.each(['Equation', 'Music'])('%s reflects undo while editing and never commits stale local text', kind => {
  const s = setup(kind, 'original');
  s.enter();
  s.type('changed');
  s.restore('original');
  expect(s.input()).toBeUndefined();
  s.enter();
  expect(s.input().props.value).toBe('original');
  s.escape();
  expect(s.content).toBe('original');
  expect(s.removed).toBe(false);
});

test.each(['Equation', 'Music'].flatMap(kind => ['before', 'after'].map(edge => [kind, edge])))('%s places typed text between adjacent embeds when exiting %s', (kind, edge) => {
  const lexical = require('lexical');
  const equations = load('app/editor/nodes/EquationNode.tsx', { '../plugins/EquationComponent': {} });
  const music = load('app/editor/nodes/MusicNode.tsx', { '../plugins/MusicComponent': {} });
  const { $placeCaret } = load(`app/editor/plugins/${kind}Component.tsx`, {
    '@/app/editor/nodes/EquationNode': equations,
    '@/app/editor/nodes/MusicNode': music,
  }, '\nexport { $placeCaret };');
  const editor = lexical.createEditor({ nodes: [equations.EquationNode, music.MusicNode], onError: error => { throw error; } });
  editor.update(() => {
    const equation = equations.$createEquationNode({ equation: 'x', inline: false });
    const score = music.$createMusicNode({ abc: 'X:1\nK:C\nCDEF|' });
    const target = kind === 'Equation' ? equation : score;
    const neighbour = kind === 'Equation' ? score : equation;
    const first = lexical.$createParagraphNode().append(lexical.$createTextNode('original'));
    lexical.$getRoot().append(first, ...(edge === 'after' ? [target, neighbour] : [neighbour, target]));
    first.selectStart();
    $placeCaret(target, edge);
    const selection = lexical.$getSelection();
    expect(lexical.$isRangeSelection(selection)).toBe(true);
    expect(selection.anchor.getNode().getTopLevelElement()).toBe(lexical.$getRoot().getChildAtIndex(2));
    selection.insertText('D');
    selection.insertText('1');
  }, { discrete: true });
  const children = editor.getEditorState().toJSON().root.children;
  expect(children[0].children[0].text).toBe('original');
  expect(children[2]).toMatchObject({ type: 'paragraph', children: [{ text: 'D1' }] });
  expect(children.filter(node => node.type === 'equation')).toEqual([expect.objectContaining({ equation: 'x' })]);
  expect(children.filter(node => node.type === 'music')).toEqual([expect.objectContaining({ abc: 'X:1\nK:C\nCDEF|' })]);
});

test('two undo and redo steps retain the equation and its serialized text', () => {
  const lexical = require('lexical');
  const { registerHistory, createEmptyHistoryState } = require('@lexical/history');
  const nodes = load('app/editor/nodes/EquationNode.tsx', { '../plugins/EquationComponent': {} });
  const editor = lexical.createEditor({ namespace: 'equation-history', nodes: [nodes.EquationNode], onError: error => { throw error; } });
  const history = createEmptyHistoryState();
  const unregister = registerHistory(editor, history, 300);
  editor.update(() => lexical.$getRoot().append(lexical.$createParagraphNode().append(lexical.$createTextNode('/equation'))), { discrete: true, tag: lexical.HISTORY_PUSH_TAG });
  editor.update(() => {
    const paragraph = lexical.$getRoot().getFirstChild();
    paragraph.clear().append(nodes.$createEquationNode({ equation: '', inline: true }));
  }, { discrete: true, tag: lexical.HISTORY_PUSH_TAG });
  editor.update(() => lexical.$getRoot().getFirstChild().getFirstChild().setEquation('x + y'), { discrete: true, tag: lexical.HISTORY_PUSH_TAG });
  const step = command => editor.update(() => { editor.dispatchCommand(command, undefined); }, { discrete: true });
  step(lexical.UNDO_COMMAND);
  step(lexical.UNDO_COMMAND);
  editor.getEditorState().read(() => expect(lexical.$getRoot().getTextContent()).toBe('/equation'));
  step(lexical.REDO_COMMAND);
  step(lexical.REDO_COMMAND);
  expect(editor.getEditorState().toJSON().root.children[0].children[0]).toMatchObject({ type: 'equation', equation: 'x + y' });
  unregister();
});


test.each(['Equation', 'Music'])('%s automatically commits the whole draft on blur as one undo step', async kind => {
  const s = setup(kind);
  const value = kind === 'Equation' ? 'k=1' : 'X:1\nK:C\nCDEF|';
  s.type('k'); s.type('k='); s.type(value);
  expect(s.updates).toEqual([]);
  await s.blur();
  if (kind === 'Music') expect(s.warnings).toEqual([]);
  expect(s.content).toBe(value);
  expect(s.updates.map(update => update.tag)).toEqual(['history-push']);
});


test.each(['Equation', 'Music'])('%s restored empty by redo stays out of editing and accepts its subsequent restored content', kind => {
  const s = setup(kind, '', false);
  expect(s.input()).toBeUndefined();
  s.restore('restored content');
  expect(s.input()).toBeUndefined();
  expect(s.content).toBe('restored content');
  s.enter();
  expect(s.input().props.value).toBe('restored content');
});

test.each(['Equation', 'Music'])('%s ignores an obsolete save after history replaces its content', kind => {
  const s = setup(kind);
  s.type('k=1');
  const oldSave = s.input().props.onKeyDown;
  s.restore('restored content');
  oldSave({ key: 'Enter', ctrlKey: true, currentTarget: { value: 'k=1', selectionStart: 0, selectionEnd: 0 }, stopPropagation() {}, preventDefault() {} });
  expect(s.content).toBe('restored content');
  expect(s.removed).toBe(false);
});


test.each(['Equation', 'Music'])('%s exposes a single-tap edit action when selected', kind => {
  const s = setup(kind, 'original', false, true);
  expect(s.input()).toBeUndefined();
  s.edit();
  expect(s.input()).toBeDefined();
});

test('moving a block waits for the menu to close and returns focus to the editor', () => {
  const frames = [], actions = [];
  const Toolbar = load('app/editor/plugins/ToolbarPlugin.tsx', {
    react: { useState: value => [typeof value === 'function' ? value() : value, () => {}], useRef: value => ({ current: value }), useCallback: fn => fn, useEffect() {} },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [{
      dispatchCommand: (...args) => actions.push(args),
      getRootElement: () => ({ focus: () => actions.push('root-focus') }),
      focus: () => actions.push('editor-focus'),
    }] },
    '@/app/editor/plugins/DraggableBlockPlugin': { MOVE_BLOCK_COMMAND: 'move-block' },
    './ImagesPlugin': {}, './FloatingLinkEditorPlugin': {}, './FindReplacePlugin': {},
    './EquationsPlugin': {}, './MusicPlugin': {},
    '@/components/ui/dropdown-menu': { DropdownMenuItem: 'DropdownMenuItem', DropdownMenuContent: 'DropdownMenuContent' },
  }, '', { requestAnimationFrame: fn => frames.push(fn) }).default;
  const nodes = [];
  const visit = node => { if (node && typeof node === 'object') { nodes.push(node); [node.props?.children].flat().forEach(visit); } };
  visit(Toolbar({}));
  nodes.find(node => node.type === 'DropdownMenuItem' && [node.props.children].flat().includes('Move block up')).props.onSelect();
  expect(actions).toEqual([]);
  nodes.find(node => node.props?.onCloseAutoFocus).props.onCloseAutoFocus({ preventDefault() {} });
  expect(actions).toEqual([]);
  frames.shift()();
  expect(actions).toEqual([['move-block', 'up'], 'root-focus', 'editor-focus']);
});


test.each(['Equation', 'Music'])('%s preserves incomplete source on blur', async kind => {
  const s = setup(kind, 'original');
  const source = kind === 'Equation' ? '\\frac{1}{' : 'X:1\nK:C\nCDE [';
  s.enter();
  s.type(source);
  await s.blur();
  expect(s.content).toBe(source);
  expect(s.input()).toBeUndefined();
  expect(s.dialog()).toBeUndefined();
});

test.each(['Equation', 'Music'])('%s exits upward from the first line without requiring the first character', async kind => {
  const s = setup(kind);
  const value = kind === 'Equation' ? 'x + y' : 'X:1\nK:C\nCDEF|';
  s.type(value);
  let prevented = false;
  await s.input().props.onKeyDown({ key: 'ArrowUp', currentTarget: { value, selectionStart: 2, selectionEnd: 2 }, stopPropagation() {}, preventDefault() { prevented = true; } });
  await new Promise(resolve => setImmediate(resolve));
  expect(prevented).toBe(true);
  expect(s.input()).toBeUndefined();
  expect(s.content).toBe(value);
});

test('equation templates use one Tab stop and arrow navigation', () => {
  const s = setup('Equation');
  const palette = () => s.render().props.children.find(child => child?.props?.role === 'toolbar');
  expect(palette().props.children.filter(button => button.props.tabIndex === 0)).toHaveLength(1);
  let focused;
  const buttons = Array.from({ length: 10 }, (_, index) => ({ focus() { focused = index; } }));
  palette().props.onKeyDown({ key: 'ArrowRight', currentTarget: { querySelectorAll: () => buttons }, target: buttons[0], preventDefault() {} });
  expect(focused).toBe(1);
  expect(palette().props.children[1].props.tabIndex).toBe(0);
  expect(palette().props.children[0].props.tabIndex).toBe(-1);
});

test.each(['Equation', 'Music'])('%s keeps vertical navigation inside middle lines and exits from the last line', async kind => {
  const s = setup(kind);
  const value = kind === 'Equation' ? 'x +\ny' : 'X:1\nK:C\nCDEF|';
  s.type(value);
  let prevented = false;
  const event = key => ({ key, currentTarget: { value, selectionStart: value.length - 1, selectionEnd: value.length - 1 }, stopPropagation() {}, preventDefault() { prevented = true; } });
  s.input().props.onKeyDown(event('ArrowUp'));
  expect(prevented).toBe(false);
  expect(s.input()).toBeDefined();
  await s.input().props.onKeyDown(event('ArrowDown'));
  await new Promise(resolve => setImmediate(resolve));
  expect(prevented).toBe(true);
  expect(s.input()).toBeUndefined();
});

test('oversized equation drafts close without truncating and report the limit', async () => {
  const s = setup('Equation', 'x');
  s.enter();
  const draft = 'x'.repeat(10001);
  s.type(draft);
  expect(s.input().props.maxLength).toBeUndefined();
  expect(s.input().props.value).toBe(draft);
  expect(s.input().props['aria-invalid']).toBe(true);
  expect(s.render().props.children.find(child => child?.props?.role === 'alert').props.children).toContain('10,000');
  await s.blur();
  expect(s.content).toBe(draft);
  expect(s.input()).toBeUndefined();
});

test('toolbar formatting allows embed blur while preserving the editor selection otherwise', () => {
  let activeEmbed = true;
  const { ToolbarButton } = load('app/editor/plugins/ToolbarPlugin.tsx', {
    './ImagesPlugin': {}, './FloatingLinkEditorPlugin': {}, './FindReplacePlugin': {}, './EquationsPlugin': {}, './MusicPlugin': {},
  }, '\nexport { ToolbarButton };', { document: { activeElement: { closest: () => activeEmbed ? {} : null } } });
  const button = find(ToolbarButton({ label: 'Bold', tooltip: 'Bold', Icon: 'icon', onClick() {} }), 'button');
  let prevented = false;
  button.props.onMouseDown({ preventDefault() { prevented = true; } });
  expect(prevented).toBe(false);
  activeEmbed = false;
  button.props.onMouseDown({ preventDefault() { prevented = true; } });
  expect(prevented).toBe(true);
});


test.each(['Equation', 'Music'])('%s preserves the exact source including surrounding whitespace', async kind => {
  const s = setup(kind);
  s.type('  unfinished source\n');
  await s.blur();
  expect(s.content).toBe('  unfinished source\n');
});

test('leaving a new untouched score removes the empty block automatically', async () => {
  const s = setup('Music');
  await s.blur();
  expect(s.removed).toBe(true);
  expect(s.content).toBe('');
});

test('a score saves without waiting for its renderer to load', async () => {
  const s = setup('Music', '', true, false, new Promise(() => {}));
  const source = 'X:1\nK:C\nCDE [';
  s.type(source);
  await s.blur();
  expect(s.content).toBe(source);
  expect(s.updates).toHaveLength(1);
  expect(s.input()).toBeUndefined();
});

test('outside score clicks resume navigation only once', async () => {
  const s = setup('Music');
  const value = 'X:1\nK:C\nCDEF|';
  s.type(value);
  await s.clickOutside();
  await s.clickOutside();
  expect(s.content).toBe(value);
  expect(s.actions).toEqual(['focus', 'click']);
});

test.each(['Equation', 'Music'])('%s closes oversized source without a discard dialog', async kind => {
  const s = setup(kind, 'original');
  s.enter();
  const draft = 'x'.repeat(10001);
  s.type(draft);
  expect(s.input().props.value).toBe(draft);
  expect(s.input().props['aria-invalid']).toBe(true);
  await s.blur();
  expect(s.content).toBe(draft);
  expect(s.input()).toBeUndefined();
  expect(s.dialog()).toBeUndefined();
});

test.each(['Equation', 'Music'])('%s marks invalid source for authors and shows a quiet raw fallback for readers', async kind => {
  const source = kind === 'Equation' ? '\\frac{1}{' : 'X:1\nK:C\nCDE [';
  const author = setup(kind, source, false);
  author.render();
  await new Promise(resolve => setImmediate(resolve));
  const tree = author.render();
  const rendered = kind === 'Equation' ? find(tree, 'span') : tree;
  expect(rendered.props.className).toContain('embed-invalid');
  expect(rendered.props['aria-invalid']).toBe(true);
  const reader = setup(kind, source, false, false, undefined, false);
  reader.render();
  await new Promise(resolve => setImmediate(resolve));
  const raw = reader.render();
  expect(raw.props.role).toBe('note');
  if (kind === 'Equation') expect(raw.type).toBe('div');
  expect(find(raw, 'pre').props.children).toBe(source);
  expect(raw.props['aria-invalid']).toBeUndefined();
  expect(raw.props.className ?? '').not.toContain('embed-invalid');
});


test.each(['Equation', 'Music'])('%s permits navigation while retaining oversized whitespace', async kind => {
  const original = kind === 'Equation' ? 'x' : 'X:1\nK:C\nCDEF|';
  const s = setup(kind, original);
  s.enter();
  const source = original + ' '.repeat(10001);
  s.type(source);
  expect(await s.clickOutside()).toBe(true);
  expect(s.content).toBe(source);
  expect(s.input()).toBeUndefined();
  expect(s.actions).toEqual(['focus', 'click']);
});

test.each(['Equation', 'Music'])('%s still removes an empty draft containing only whitespace', kind => {
  const s = setup(kind);
  s.type(' '.repeat(10001));
  s.escape();
  expect(s.removed).toBe(true);
});
