import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const styles = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/styleConfig.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: styles });
const noteContent = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/note-content.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: noteContent, require: () => styles });

const lexical = require('lexical');
const rich = require('@lexical/rich-text');
const lists = require('@lexical/list');
const links = require('@lexical/link');
const code = require('@lexical/code');
const config = { namespace: 'test', nodes: [rich.HeadingNode, rich.QuoteNode, lists.ListNode, lists.ListItemNode, links.LinkNode, links.AutoLinkNode, code.CodeNode, code.CodeHighlightNode], onError: error => { throw error; } };
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/extract-selection.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  exports, Error,
  require: name => name === '../lexical-config' ? { editorConfig: config } : name === '@/app/editor/note-content' ? noteContent : require(name),
});
function make(build) { const editor = lexical.createEditor(config); editor.update(build, { discrete: true }); return editor; }
const text = json => json.text ?? json.children?.map(text).join('') ?? '';

test('partial text extraction preserves format and replaces only the selected characters without changing the editor', () => {
  const editor = make(() => { const node = lexical.$createTextNode('abcdef').setFormat(3); lexical.$getRoot().append(lexical.$createParagraphNode().append(node)); node.select(2, 5); });
  const { capture } = exports.captureSelection(editor);
  const draft = exports.prepareExtraction(editor, capture, 'New note', 'uuid');
  expect(text(JSON.parse(draft.extractedContent).root)).toBe('cde');
  expect(JSON.parse(draft.extractedContent).root.children[0].children[0].format).toBe(3);
  expect(text(JSON.parse(draft.sourceContent).root)).toBe('abNew notef');
  expect(draft.sourceContent).toContain('tramo-extraction:uuid');
  expect(JSON.stringify(editor.getEditorState().toJSON())).toBe(capture.content);
});

test('selection across paragraphs preserves blocks and existing links', () => {
  const editor = make(() => {
    const a = lexical.$createTextNode('first'), b = lexical.$createTextNode('second').setFormat(1);
    lexical.$getRoot().append(lexical.$createParagraphNode().append(a), lexical.$createParagraphNode().append(links.$createLinkNode('https://example.com').append(b)));
    const selection = a.select(2, 2); selection.focus.set(b.getKey(), 3, 'text');
  });
  const draft = exports.prepareExtraction(editor, exports.captureSelection(editor).capture, 'Parts', 'uuid');
  const extracted = JSON.parse(draft.extractedContent).root;
  expect(extracted.children).toHaveLength(2);
  expect(text(extracted)).toBe('rstsec');
  expect(draft.extractedContent).toContain('https://example.com');
  expect(text(JSON.parse(draft.sourceContent).root)).toBe('fiPartsond');
});

test.each([false, true])('extraction without a link removes only the selection, whole note: %s', whole => {
  const editor = make(() => {
    const node = lexical.$createTextNode('before selected after').setFormat(3);
    lexical.$getRoot().append(lexical.$createParagraphNode().append(node));
    node.select(whole ? 0 : 7, whole ? 21 : 15);
  });
  const capture = exports.captureSelection(editor).capture;
  const draft = exports.prepareExtraction(editor, capture, 'Untitled', 'uuid', false);
  expect(text(JSON.parse(draft.extractedContent).root)).toBe(whole ? 'before selected after' : 'selected');
  expect(text(JSON.parse(draft.sourceContent).root)).toBe(whole ? '' : 'before  after');
  expect(draft.sourceContent).not.toContain('tramo-extraction');
  expect(draft.sourceContent).not.toContain('Untitled');
  expect(JSON.stringify(editor.getEditorState().toJSON())).toBe(capture.content);
});

test('list extraction preserves list nesting and checkbox state', () => {
  const editor = make(() => {
    const a = lexical.$createTextNode('first'), b = lexical.$createTextNode('second');
    const first = lists.$createListItemNode(true).append(a), second = lists.$createListItemNode(false).append(b);
    lexical.$getRoot().append(lists.$createListNode('check').append(first, second));
    const selection = a.select(0, 0); selection.focus.set(b.getKey(), 6, 'text');
  });
  const draft = exports.prepareExtraction(editor, exports.captureSelection(editor).capture, 'List', 'uuid');
  const list = JSON.parse(draft.extractedContent).root.children[0];
  expect(list.type).toBe('list'); expect(list.listType).toBe('check'); expect(list.children[0].checked).toBe(true); expect(list.children[1].checked).toBe(false);
});

test('unsupported block selections are rejected explicitly and changed snapshots cannot be extracted', () => {
  const codeEditor = make(() => { const node = lexical.$createTextNode('code'); lexical.$getRoot().append(code.$createCodeNode().append(node)); node.select(0, 4); });
  expect(exports.captureSelection(codeEditor).reason).toContain('code');
  const editor = make(() => { const node = lexical.$createTextNode('text'); lexical.$getRoot().append(lexical.$createParagraphNode().append(node)); node.select(0, 4); });
  const capture = exports.captureSelection(editor).capture;
  editor.update(() => lexical.$getRoot().getFirstChild().getFirstChild().setTextContent('changed'), { discrete: true });
  expect(() => exports.prepareExtraction(editor, capture, 'Title', 'uuid')).toThrow('note changed');
});

test('partial extraction inside a link preserves the surrounding link and never nests links', () => {
  const editor = make(() => { const node = lexical.$createTextNode('abcdef'); lexical.$getRoot().append(lexical.$createParagraphNode().append(links.$createLinkNode('https://example.com').append(node))); node.select(2, 4); });
  const draft = exports.prepareExtraction(editor, exports.captureSelection(editor).capture, 'New', 'uuid');
  const result = JSON.parse(draft.sourceContent).root;
  expect(text(result)).toBe('abNewef');
  const walk = (node, insideLink = false) => {
    if (node.type === 'link') expect(insideLink).toBe(false);
    node.children?.forEach(child => walk(child, insideLink || node.type === 'link'));
  };
  walk(result);
});

test('captures and extracts from an unfocused editor when multiple editors exist', () => {
  const first = make(() => { const node = lexical.$createTextNode('before selected after'); lexical.$getRoot().append(lexical.$createParagraphNode().append(node)); node.select(7, 15); });
  const second = make(() => { lexical.$getRoot().append(lexical.$createParagraphNode().append(lexical.$createTextNode('other note'))); });
  first.setEditable(false);
  expect(first.getRootElement()).toBeNull(); expect(second.getRootElement()).toBeNull();
  const { capture } = exports.captureSelection(first);
  const draft = exports.prepareExtraction(first, capture, 'New note', 'uuid');
  expect(text(JSON.parse(draft.extractedContent).root)).toBe('selected');
  expect(text(JSON.parse(draft.sourceContent).root)).toBe('before New note after');
  expect(JSON.stringify(first.getEditorState().toJSON())).toBe(capture.content);
  expect(text(second.getEditorState().toJSON().root)).toBe('other note');
});

test('invalid extracted content leaves the current note and history untouched', () => {
  const editor = make(() => lexical.$getRoot().append(lexical.$createParagraphNode().append(lexical.$createTextNode('original'))));
  const state = editor.getEditorState();
  const current = { editor, editorState: state };
  const history = { current, undoStack: [current], redoStack: [] };
  const invalid = JSON.stringify({ root: { type: 'root', version: 1, children: [{ type: 'heading', version: 1, tag: 'script', children: [] }] } });
  expect(() => exports.applyExtractedContent(editor, history, invalid)).toThrow('Invalid heading tag');
  expect(editor.getEditorState()).toBe(state);
  expect(history.current).toBe(current);
  expect(history.undoStack).toEqual([current]);
});

test('extracted content passes through the same style filter as a loaded note', () => {
  const editor = make(() => lexical.$getRoot().append(lexical.$createParagraphNode().append(lexical.$createTextNode('original'))));
  const history = { current: null, undoStack: [], redoStack: [] };
  const incoming = editor.getEditorState().toJSON();
  incoming.root.children[0].children[0].style = 'position:fixed;color:rgb(1, 2, 3)';
  exports.applyExtractedContent(editor, history, JSON.stringify(incoming));
  editor.getEditorState().read(() => {
    expect(lexical.$getRoot().getFirstChild().getFirstChild().getStyle()).toBe('color: rgb(1, 2, 3);');
  });
});
