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

const editorText = editor => text(editor.getEditorState().toJSON().root);

test('partial text extraction preserves format and replaces only the selected characters', () => {
  const editor = make(() => { const node = lexical.$createTextNode('abcdef').setFormat(3); lexical.$getRoot().append(lexical.$createParagraphNode().append(node)); node.select(2, 5); });
  const { capture } = exports.captureSelection(editor);
  const extracted = JSON.parse(exports.prepareExtraction(editor, capture));
  expect(text(extracted.root)).toBe('cde');
  expect(extracted.root.children[0].children[0].format).toBe(3);
  expect(editorText(editor)).toBe('abcdef');
  expect(exports.replaceExtractedSelection(editor, capture, '42', 'New note', true)).toBe(true);
  expect(editorText(editor)).toBe('abNew notef');
  expect(JSON.stringify(editor.getEditorState().toJSON())).toContain('tramo-idea:42');
});

test('selection across paragraphs preserves blocks and existing links', () => {
  const editor = make(() => {
    const a = lexical.$createTextNode('first'), b = lexical.$createTextNode('second').setFormat(1);
    lexical.$getRoot().append(lexical.$createParagraphNode().append(a), lexical.$createParagraphNode().append(links.$createLinkNode('https://example.com').append(b)));
    const selection = a.select(2, 2); selection.focus.set(b.getKey(), 3, 'text');
  });
  const { capture } = exports.captureSelection(editor);
  const extracted = JSON.parse(exports.prepareExtraction(editor, capture)).root;
  expect(extracted.children).toHaveLength(2);
  expect(text(extracted)).toBe('rstsec');
  expect(JSON.stringify(extracted)).toContain('https://example.com');
  exports.replaceExtractedSelection(editor, capture, '7', 'Parts', true);
  expect(editorText(editor)).toBe('fiPartsond');
});

test.each([false, true])('extraction without a link removes only the selection, whole note: %s', whole => {
  const editor = make(() => {
    const node = lexical.$createTextNode('before selected after').setFormat(3);
    lexical.$getRoot().append(lexical.$createParagraphNode().append(node));
    node.select(whole ? 0 : 7, whole ? 21 : 15);
  });
  const capture = exports.captureSelection(editor).capture;
  expect(text(JSON.parse(exports.prepareExtraction(editor, capture)).root)).toBe(whole ? 'before selected after' : 'selected');
  exports.replaceExtractedSelection(editor, capture, '7', 'Untitled', false);
  expect(editorText(editor)).toBe(whole ? '' : 'before  after');
  expect(JSON.stringify(editor.getEditorState().toJSON())).not.toContain('tramo-idea');
});

test('list extraction preserves list nesting and checkbox state', () => {
  const editor = make(() => {
    const a = lexical.$createTextNode('first'), b = lexical.$createTextNode('second');
    const first = lists.$createListItemNode(true).append(a), second = lists.$createListItemNode(false).append(b);
    lexical.$getRoot().append(lists.$createListNode('check').append(first, second));
    const selection = a.select(0, 0); selection.focus.set(b.getKey(), 6, 'text');
  });
  const list = JSON.parse(exports.prepareExtraction(editor, exports.captureSelection(editor).capture)).root.children[0];
  expect(list.type).toBe('list'); expect(list.listType).toBe('check'); expect(list.children[0].checked).toBe(true); expect(list.children[1].checked).toBe(false);
});

test('unsupported block selections are rejected and a selection changed meanwhile is left in place', () => {
  const codeEditor = make(() => { const node = lexical.$createTextNode('code'); lexical.$getRoot().append(code.$createCodeNode().append(node)); node.select(0, 4); });
  expect(exports.captureSelection(codeEditor).reason).toContain('code');
  const editor = make(() => { const node = lexical.$createTextNode('text'); lexical.$getRoot().append(lexical.$createParagraphNode().append(node)); node.select(0, 4); });
  const capture = exports.captureSelection(editor).capture;
  editor.update(() => lexical.$getRoot().getFirstChild().getFirstChild().setTextContent('changed'), { discrete: true });
  expect(exports.replaceExtractedSelection(editor, capture, '7', 'Title', true)).toBe(false);
  expect(editorText(editor)).toBe('changed');
});

test('edits elsewhere in the note do not block replacing the selection', () => {
  const editor = make(() => {
    const node = lexical.$createTextNode('before selected after');
    lexical.$getRoot().append(lexical.$createParagraphNode().append(node), lexical.$createParagraphNode().append(lexical.$createTextNode('peer')));
    node.select(7, 15);
  });
  const capture = exports.captureSelection(editor).capture;
  editor.update(() => lexical.$getRoot().getLastChild().getFirstChild().setTextContent('peer edit'), { discrete: true });
  expect(exports.replaceExtractedSelection(editor, capture, '7', 'New', true)).toBe(true);
  expect(editorText(editor)).toBe('before New afterpeer edit');
});

test('partial extraction inside a link preserves the surrounding link and never nests links', () => {
  const editor = make(() => { const node = lexical.$createTextNode('abcdef'); lexical.$getRoot().append(lexical.$createParagraphNode().append(links.$createLinkNode('https://example.com').append(node))); node.select(2, 4); });
  exports.replaceExtractedSelection(editor, exports.captureSelection(editor).capture, '7', 'New', true);
  const result = editor.getEditorState().toJSON().root;
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
  expect(text(JSON.parse(exports.prepareExtraction(first, capture)).root)).toBe('selected');
  exports.replaceExtractedSelection(first, capture, '7', 'New note', true);
  expect(editorText(first)).toBe('before New note after');
  expect(editorText(second)).toBe('other note');
});
