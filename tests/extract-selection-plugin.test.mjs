import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup({ inTrail = true } = {}) {
  const states = [], refs = [], effects = [], requests = [], accepted = [], applied = [], history = [], saves = [];
  let si = 0, ri = 0, initialized = false, inspect, now = 0, timerId = 0, collapsed = false, captures = 0;
  let rect = { top: 80, bottom: 100, left: 100 };
  let viewport = { top: 0, bottom: 600, left: 0, right: 1000 };
  const portals = [];
  const prepared = [];
  const container = { scrollTop: 0, scrollLeft: 0, getBoundingClientRect: () => viewport };
  const timers = new Map();
  const advance = ms => { now += ms; for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.fn(); } };
  const original = { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'original' }] }] } };
  let current = original, editable = true, failSave = false;
  const captured = { state: { toJSON: () => original }, content: JSON.stringify(original), selection: {} };
  const root = { contains: () => true, closest: () => container };
  const editor = {
    getEditorState: () => ({ toJSON: () => current }), getRootElement: () => root,
    registerUpdateListener: () => () => {}, isEditable: () => editable, setEditable: value => { editable = value; },
    parseEditorState: content => JSON.parse(content), setEditorState: state => { current = state; },
    dispatchCommand: command => history.push(command),
  };
  const jsx = (type, props) => ({ type, props }); const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/ExtractSelectionPlugin.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, Error, requestAnimationFrame: fn => { const id = ++timerId; timers.set(id, { fn, at: now + 16 }); return id; }, cancelAnimationFrame: id => timers.delete(id), crypto: { randomUUID: () => 'fixed-operation-id' },
    require: name => ({
      react: { useRef: value => refs[ri++] ?? (refs[ri - 1] = { current: value }), useState: value => { const index = si++; if (!(index in states)) states[index] = value; return [states[index], next => { states[index] = next; }]; }, useEffect: effect => { if (!initialized) effects.push(effect); } },
      'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'react-dom': { createPortal: (element, target) => { portals.push(target); return element; } },
      '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [editor] }, lexical: { CLEAR_HISTORY_COMMAND: 'clear-history' },
      '@/components/ui/button': { Button: 'Button' }, '@/components/ui/input': { Input: 'Input' },
      '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogContent', 'DialogDescription', 'DialogHeader', 'DialogTitle'].map(name => [name, name])),
      './extract-selection': { applyExtractedContent: (editor, _history, content) => { editor.setEditorState(editor.parseEditorState(content)); editor.dispatchCommand('clear-history'); }, captureSelection: () => { captures++; return { capture: captured }; }, prepareExtraction: (...args) => { prepared.push(args); return { expectedContent: captured.content, sourceContent: 'replacement draft', extractedContent: 'extracted draft' }; } },
      '@/lib/item-content-client': { getExtractionEpoch: () => 0, acceptExtractionEpoch: (...args) => accepted.push(args) },
      '@/lib/extract-selection-client': { getExtractionTrailCount: async () => 2, extractSelection: (...args) => new Promise((resolve, reject) => requests.push({ args, resolve, reject })) },
    })[name],
    window: { innerWidth: 1000, getSelection: () => ({ get isCollapsed() { return collapsed; }, rangeCount: 1, anchorNode: {}, focusNode: {}, getRangeAt: () => ({ getBoundingClientRect: () => rect }) }), addEventListener: () => {}, removeEventListener: () => {} },
    document: { body: {}, addEventListener: (_, fn) => { inspect = fn; }, removeEventListener: () => {} },
  });
  const actions = { beforeExtract: async () => { saves.push('save'); if (failSave) throw new Error('Save failed'); }, pauseItem: () => {}, resumeItem: () => {}, acceptPersistedItem: () => {}, onExtracted: (...args) => applied.push(args) };
  const flatten = element => Array.isArray(element) ? element.flatMap(flatten) : element?.props ? [element, ...flatten(element.props.children)] : [];
  function render() { si = ri = 0; const elements = flatten(exports.default({ projectId: 'project', itemId: 'source', trail: inTrail ? { id: '1', itemIds: ['2', '3'] } : undefined, sharedCount: 2, actions, onOpen: () => {} })); if (!initialized) { initialized = true; effects.forEach(fn => fn()); } return elements; }
  function button(label) { return render().find(node => node.type === 'Button' && node.props.children === label); }
  function open() { render(); inspect(); advance(16); button('Extract to new note').props.onClick(); render().find(node => node.type === 'Input').props.onChange({ target: { value: 'New note' } }); }
  const result = { item: { id: 'new', title: 'New note', content: 'extracted' }, sourceContent: JSON.stringify({ root: { children: [{ text: 'replacement' }] } }), extractionEpoch: 1, steps: [] };
  return { render, button, open, advance, inspect: () => inspect(), setRect: next => { rect = next; }, setViewport: next => { viewport = next; }, container, portals, collapse: () => { collapsed = true; }, captures: () => captures, result, requests, accepted, applied, history, saves, prepared, failSave: () => { failSave = true; }, change: () => { current = { root: { children: [{ text: 'later edit' }] } }; }, content: () => current, editable: () => editable };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('cancel preserves the source and performs no saves or extraction', async () => {
  const s = setup(); s.open(); await settle(); s.button('Cancel').props.onClick();
  expect(s.requests).toHaveLength(0); expect(s.saves).toHaveLength(0); expect(s.applied).toHaveLength(0); expect(s.content().root.children[0].children[0].text).toBe('original');
});
test('failed save preserves the captured selection and stops extraction', async () => {
  const s = setup(); s.open(); await settle(); s.failSave(); s.button('Extract').props.onClick(); await settle();
  expect(s.requests).toHaveLength(0); expect(s.render().find(node => node.props.role === 'alert').props.children).toBe('Save failed'); expect(s.editable()).toBe(true); expect(s.applied).toHaveLength(0);
});
test('double submit is blocked and ambiguous failure retries the same operation without resaving obsolete source', async () => {
  const s = setup(); s.open(); await settle(); const button = s.button('Extract'); button.props.onClick(); button.props.onClick(); await settle();
  expect(s.requests).toHaveLength(1); expect(s.editable()).toBe(false);
  s.requests[0].reject(new Error('Connection lost')); await settle();
  s.button('Try again').props.onClick(); await settle();
  expect(s.requests).toHaveLength(2); expect(s.requests[1].args[2]).toBe(s.requests[0].args[2]); expect(s.saves).toHaveLength(1);
  s.requests[1].resolve(s.result); await settle();
  expect(s.applied).toHaveLength(1); expect(s.history).toEqual(['clear-history']); expect(s.accepted[0]).toEqual(['source', 1, s.result.sourceContent]); expect(s.editable()).toBe(true); expect(s.content()).toEqual(JSON.parse(s.result.sourceContent));
});
test('late response does not discard content changed after submission', async () => {
  const s = setup(); s.open(); await settle(); s.button('Extract').props.onClick(); await settle(); s.change(); s.requests[0].resolve(s.result); await settle();
  expect(s.applied[0][3]).toBe(false); expect(s.accepted).toHaveLength(0); expect(s.history).toHaveLength(0); expect(s.content().root.children[0].text).toBe('later edit'); expect(s.render().find(node => node.props.role === 'alert').props.children).toContain('local text was kept');
});

test('floats above the selection without debounce and stays anchored while extending down', () => {
  const s = setup(); s.render(); s.inspect();
  s.advance(16);
  let floating = s.render().find(node => node.props.className?.includes('absolute z-10'));
  expect(floating.props.style.top).toBe(72);
  expect(floating.props.className).toContain('-translate-y-full');
  expect(s.captures()).toBe(0);
  s.setRect({ top: 80, bottom: 200, left: 100 });
  s.inspect(); s.advance(16);
  floating = s.render().find(node => node.props.className?.includes('absolute z-10'));
  expect(floating.props.style.top).toBe(72);
  s.setRect({ top: 60, bottom: 200, left: 100 });
  s.inspect(); s.advance(16);
  floating = s.render().find(node => node.props.className?.includes('absolute z-10'));
  expect(floating.props.style.top).toBe(52);
  s.setRect({ top: 40, bottom: 200, left: 100 });
  s.inspect(); s.advance(16);
  floating = s.render().find(node => node.props.className?.includes('absolute z-10'));
  expect(floating.props.style.top).toBe(208);
  expect(floating.props.className).not.toContain('-translate-y-full');
  s.collapse(); s.inspect(); s.advance(16);
  expect(s.button('Extract to new note')).toBeUndefined();
  expect(s.captures()).toBe(0);
});

test('floating action is local to the editor scroller and hides when the selection scrolls out', () => {
  const s = setup(); s.render();
  s.setViewport({ top: 64, bottom: 500, left: 100, right: 700 });
  s.container.scrollTop = 200;
  s.setRect({ top: 140, bottom: 180, left: 130 });
  s.inspect(); s.advance(16);
  const floating = s.render().find(node => node.props.className?.includes('absolute z-10'));
  expect(floating.props.style).toEqual({ top: 268, left: 30 });
  expect(s.portals.at(-1)).toBe(s.container);
  s.setRect({ top: 510, bottom: 530, left: 130 });
  s.inspect(); s.advance(16);
  expect(s.button('Extract to new note')).toBeUndefined();
  s.setRect({ top: 10, bottom: 30, left: 130 });
  s.inspect(); s.advance(16);
  expect(s.button('Extract to new note')).toBeUndefined();
});

test('offers next, last and outside in order and sends last placement with the trail snapshot', async () => {
  const s = setup(); s.open(); await settle();
  expect(s.render().find(node => node.type === 'select').props.value).toBe('last');
  const choices = s.render().filter(node => node.type === 'option');
  expect(choices.map(node => node.props.children)).toEqual(['Next step in this trail', 'Last step in this trail', 'Note outside trails']);
  s.button('Extract').props.onClick(); await settle();
  expect(s.requests[0].args[2]).toMatchObject({ trailId: 1, appendToTrail: true, expectedOrder: [2, 3] });
});

test.each(['', '   '])('empty title %j extracts as Untitled with a link by default', async title => {
  const s = setup(); s.open(); await settle();
  const input = s.render().find(node => node.type === 'Input');
  expect(input.props.required).toBeUndefined();
  input.props.onChange({ target: { value: title } });
  expect(s.button('Extract').props.disabled).toBe(false);
  expect(s.render().find(node => node.props.type === 'checkbox').props.checked).toBe(true);
  s.button('Extract').props.onClick(); await settle();
  expect(s.requests[0].args[2]).toMatchObject({ title: 'Untitled', leaveLink: true, appendToTrail: true });
  expect(s.prepared[0].slice(2)).toEqual(['Untitled', 'fixed-operation-id', true]);
});

test('link can be disabled independently of trail placement and stays frozen on retry', async () => {
  const s = setup(); s.open(); await settle();
  s.render().find(node => node.props.type === 'checkbox').props.onChange({ target: { checked: false } });
  s.button('Extract').props.onClick(); await settle();
  expect(s.requests[0].args[2]).toMatchObject({ title: 'New note', leaveLink: false, trailId: 1, appendToTrail: true });
  expect(s.prepared[0][4]).toBe(false);
  expect(s.render().find(node => node.props.type === 'checkbox').props.disabled).toBe(true);
  s.requests[0].reject(new Error('Connection lost')); await settle();
  expect(s.render().find(node => node.props.type === 'checkbox').props.disabled).toBe(true);
  s.button('Try again').props.onClick(); await settle();
  expect(s.requests[1].args[2]).toBe(s.requests[0].args[2]);
});

test('extraction without a current trail defaults to outside', async () => {
  const s = setup({ inTrail: false }); s.open(); await settle();
  expect(s.render().find(node => node.type === 'select').props.value).toBe('outside');
  s.button('Extract').props.onClick(); await settle();
  expect(s.requests[0].args[2]).toMatchObject({ trailId: null, expectedOrder: null, appendToTrail: false });
});
