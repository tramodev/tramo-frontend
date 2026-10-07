import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup() {
  const states = [], refs = [], effects = [], requests = [], accepted = [], applied = [], history = [], saves = [];
  let si = 0, ri = 0, initialized = false, inspect;
  const original = { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'original' }] }] } };
  let current = original, editable = true, failSave = false;
  const captured = { state: { toJSON: () => original }, content: JSON.stringify(original), selection: {} };
  const root = { contains: () => true };
  const editor = {
    getEditorState: () => ({ toJSON: () => current }), getRootElement: () => root,
    registerUpdateListener: () => () => {}, isEditable: () => editable, setEditable: value => { editable = value; },
    parseEditorState: content => JSON.parse(content), setEditorState: state => { current = state; },
    dispatchCommand: command => history.push(command),
  };
  const jsx = (type, props) => ({ type, props }); const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/ExtractSelectionPlugin.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, Error, crypto: { randomUUID: () => 'fixed-operation-id' },
    require: name => ({
      react: { useRef: value => refs[ri++] ?? (refs[ri - 1] = { current: value }), useState: value => { const index = si++; if (!(index in states)) states[index] = value; return [states[index], next => { states[index] = next; }]; }, useEffect: effect => { if (!initialized) effects.push(effect); } },
      'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'react-dom': { createPortal: element => element },
      '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [editor] }, lexical: { CLEAR_HISTORY_COMMAND: 'clear-history' },
      '@/components/ui/button': { Button: 'Button' }, '@/components/ui/input': { Input: 'Input' },
      '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogContent', 'DialogDescription', 'DialogHeader', 'DialogTitle'].map(name => [name, name])),
      './extract-selection': { applyExtractedContent: (editor, _history, content) => { editor.setEditorState(editor.parseEditorState(content)); editor.dispatchCommand('clear-history'); }, captureSelection: () => ({ capture: captured }), prepareExtraction: () => ({ expectedContent: captured.content, sourceContent: 'replacement draft', extractedContent: 'extracted draft' }) },
      '@/lib/item-content-client': { getExtractionEpoch: () => 0, acceptExtractionEpoch: (...args) => accepted.push(args) },
      '@/lib/extract-selection-client': { getExtractionTrailCount: async () => 2, extractSelection: (...args) => new Promise((resolve, reject) => requests.push({ args, resolve, reject })) },
    })[name],
    window: { innerWidth: 1000, innerHeight: 800, getSelection: () => ({ isCollapsed: false, rangeCount: 1, anchorNode: {}, focusNode: {}, getRangeAt: () => ({ getBoundingClientRect: () => ({ bottom: 100, left: 100 }) }) }) },
    document: { body: {}, addEventListener: (_, fn) => { inspect = fn; }, removeEventListener: () => {} },
  });
  const actions = { beforeExtract: async () => { saves.push('save'); if (failSave) throw new Error('Save failed'); }, pauseItem: () => {}, resumeItem: () => {}, acceptPersistedItem: () => {}, onExtracted: (...args) => applied.push(args) };
  const flatten = element => Array.isArray(element) ? element.flatMap(flatten) : element?.props ? [element, ...flatten(element.props.children)] : [];
  function render() { si = ri = 0; const elements = flatten(exports.default({ projectId: 'project', itemId: 'source', trail: { id: '1', itemIds: ['2', '3'] }, sharedCount: 2, actions, onOpen: () => {} })); if (!initialized) { initialized = true; effects.forEach(fn => fn()); } return elements; }
  function button(label) { return render().find(node => node.type === 'Button' && node.props.children === label); }
  function open() { render(); inspect(); button('Extract to new note').props.onClick(); render().find(node => node.type === 'Input').props.onChange({ target: { value: 'New note' } }); }
  const result = { item: { id: 'new', title: 'New note', content: 'extracted' }, sourceContent: JSON.stringify({ root: { children: [{ text: 'replacement' }] } }), extractionEpoch: 1, steps: [] };
  return { render, button, open, result, requests, accepted, applied, history, saves, failSave: () => { failSave = true; }, change: () => { current = { root: { children: [{ text: 'later edit' }] } }; }, content: () => current, editable: () => editable };
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
