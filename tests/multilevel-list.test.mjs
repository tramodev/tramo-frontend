import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const lexical = require('lexical');
const list = require('@lexical/list');

const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/list-style.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require });
const { $setNumberedList, $isMultilevelList } = exports;

function editorWithParagraph() {
  const editor = lexical.createEditor({ namespace: 'multilevel', nodes: [list.ListNode, list.ListItemNode], onError: error => { throw error; } });
  editor.update(() => {
    const text = lexical.$createTextNode('text');
    lexical.$getRoot().append(lexical.$createParagraphNode().append(text));
    text.selectEnd();
  }, { discrete: true });
  return editor;
}

const read = editor => editor.getEditorState().read(() => {
  const first = lexical.$getRoot().getFirstChild();
  return { type: list.$isListNode(first) ? first.getListType() : first.getType(), multilevel: $isMultilevelList(first) };
});

test('multilevel turns a paragraph into a multilevel numbered list', () => {
  const editor = editorWithParagraph();
  editor.update(() => $setNumberedList(true), { discrete: true });
  expect(read(editor)).toEqual({ type: 'number', multilevel: true });
});

test('switching between numbered and multilevel keeps the list', () => {
  const editor = editorWithParagraph();
  editor.update(() => $setNumberedList(true), { discrete: true });
  editor.update(() => $setNumberedList(false), { discrete: true });
  expect(read(editor)).toEqual({ type: 'number', multilevel: false });
  editor.update(() => $setNumberedList(true), { discrete: true });
  expect(read(editor)).toEqual({ type: 'number', multilevel: true });
});

test('multilevel survives serialization', () => {
  const editor = editorWithParagraph();
  editor.update(() => $setNumberedList(true), { discrete: true });
  const restored = lexical.createEditor({ namespace: 'multilevel', nodes: [list.ListNode, list.ListItemNode], onError: error => { throw error; } });
  restored.setEditorState(restored.parseEditorState(JSON.stringify(editor.getEditorState().toJSON())));
  expect(read(restored)).toEqual({ type: 'number', multilevel: true });
});
