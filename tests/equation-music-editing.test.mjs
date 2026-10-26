import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path, overrides, suffix = '', globals = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8') + suffix, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => overrides[name] ?? (name.startsWith('@/') ? {} : require(name)), ...globals });
  return exports;
}
function find(element, type) {
  if (!element || typeof element !== 'object') return;
  if (element.type === type) return element;
  return [element.props?.children].flat().map(child => find(child, type)).find(Boolean);
}
function setup(kind, initial = '', fresh = initial === '', selected = false) {
  const field = kind === 'Equation' ? 'equation' : 'abc';
  const states = [], effects = [], listeners = [], refs = [], updates = [];
  let index = 0, refIndex = 0, content = initial, removed = false;
  const node = { setEquation: value => { content = value; }, setAbc: value => { content = value; }, getEquation: () => content, getAbc: () => content, remove: () => { removed = true; } };
  const editor = { isEditable: () => true, update: (fn, options) => { updates.push(options); fn(); }, registerCommand: () => () => {}, registerUpdateListener: listener => { listeners.push(listener); return () => {}; } };
  const editingDecorators = new WeakMap([[editor, new Set(fresh ? ['embed'] : [])]]);
  const component = load(`app/editor/plugins/${kind}Component.tsx`, {
    react: {
      useState: initial => { const i = index++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = value; }]; },
      useRef: value => refs[refIndex++] ??= { current: value }, useCallback: fn => fn, useEffect: fn => effects.push(fn), useLayoutEffect() {},
    },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [editor] },
    '@lexical/react/useLexicalNodeSelection': { useLexicalNodeSelection: () => [selected, () => {}, () => {}] },
    lexical: { $getNodeByKey: () => node, HISTORIC_TAG: 'historic', HISTORY_PUSH_TAG: 'history-push', HISTORY_MERGE_TAG: 'history-merge' },
    [`@/app/editor/nodes/${kind}Node`]: { [`$is${kind}Node`]: value => value === node },
    '@/app/editor/plugins/decoratorCaret': { editingDecorators },
    '@/app/editor/plugins/MusicPlugin': { DEFAULT_ABC: 'X:1\nK:C\n' },
  }).default;
  const render = () => { index = refIndex = 0; const tree = component({ [field]: content, inline: false, nodeKey: 'embed' }); effects.splice(0).forEach(fn => fn()); return tree; };
  const input = () => find(render(), 'textarea');
  return {
    input, updates,
    restore: value => { content = value; listeners.forEach(fn => fn({ editorState: { read: fn => fn() }, tags: new Set(['historic']) })); },
    edit: () => find(render(), 'button').props.onClick({ stopPropagation() {} }),
    enter: () => find(render(), kind === 'Equation' ? 'span' : 'div').props.onDoubleClick(),
    type: value => input().props.onChange({ target: { value } }),
    escape: () => input().props.onKeyDown({ key: 'Escape', currentTarget: { value: content, selectionStart: 0, selectionEnd: 0 }, stopPropagation() {}, preventDefault() {} }),
    get content() { return content; }, get removed() { return removed; },
  };
}

test.each(['Equation', 'Music'])('%s writes to its node before blur and Escape keeps new content', kind => {
  const s = setup(kind);
  s.type('written before finishing');
  expect(s.content).toBe('written before finishing');
  s.escape();
  expect(s.removed).toBe(false);
  expect(s.content).toBe('written before finishing');
  expect(s.input()).toBeUndefined();
});

test.each(['Equation', 'Music'])('%s keeps edits to an existing embed on Escape', kind => {
  const s = setup(kind, 'original');
  s.enter();
  s.type('original + changes');
  s.escape();
  expect(s.content).toBe('original + changes');
  expect(s.removed).toBe(false);
});

test.each(['Equation', 'Music'])('%s removes an explicitly finished empty embed', kind => {
  const s = setup(kind);
  s.type('');
  s.escape();
  expect(s.removed).toBe(true);
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


test.each(['Equation', 'Music'])('%s groups typing into one undo step and starts a new step after history changes', kind => {
  const s = setup(kind);
  s.type('k'); s.type('k='); s.type('k=1');
  expect(s.updates.map(update => update.tag)).toEqual(['history-push', 'history-merge', 'history-merge']);
  s.restore(''); s.enter(); s.type('new edit');
  expect(s.updates.at(-1).tag).toBe('history-push');
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

test.each(['Equation', 'Music'])('%s ignores an obsolete blur after history replaces its content', kind => {
  const s = setup(kind);
  s.type('k=1');
  const oldBlur = s.input().props.onBlur;
  s.restore('restored content');
  oldBlur();
  expect(s.content).toBe('restored content');
  expect(s.removed).toBe(false);
});


test.each(['Equation', 'Music'])('%s exposes a single-tap edit action when selected', kind => {
  const s = setup(kind, 'original', false, true);
  expect(s.input()).toBeUndefined();
  s.edit();
  expect(s.input()).toBeDefined();
});
