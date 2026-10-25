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
const { registerRichText } = require('@lexical/rich-text');
const { $insertDataTransferForRichText } = require('@lexical/clipboard');

function setup() {
  const editor = lexical.createEditor({ namespace: 'test', onError: error => { throw error; } });
  editor.update(() => {
    lexical.$getRoot().append(lexical.$createParagraphNode().append(lexical.$createTextNode('beforeafter')));
    lexical.$getRoot().getFirstChild().getFirstChild().select(6, 6);
  }, { discrete: true });
  return editor;
}

function loadPasteHandler(editor, lexicalOverrides = {}) {
  let handler;
  const instance = editor ?? {};
  const original = instance.registerCommand;
  instance.registerCommand = (_command, callback) => { handler = callback; return () => {}; };
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/PastePlugin.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: name => {
      if (name === 'react') return { useEffect: effect => effect() };
      if (name === '@lexical/react/LexicalComposerContext') return { useLexicalComposerContext: () => [instance] };
      if (name === '@/app/editor/note-content') return noteContent;
      if (name === 'lexical') return { ...lexical, ...lexicalOverrides };
      return require(name);
    },
    DOMParser: class { constructor() { throw new Error('Plain text must not be parsed as HTML'); } },
  });
  exports.default();
  instance.registerCommand = original;
  return handler;
}

function paragraphs(editor) {
  return editor.getEditorState().read(() => lexical.$getRoot().getChildren().map(node => node.getTextContent()));
}

test('Enter splits a paragraph at the caret', () => {
  const editor = setup();
  const unregister = registerRichText(editor);
  editor.update(() => editor.dispatchCommand(lexical.KEY_ENTER_COMMAND, { shiftKey: false, preventDefault() {} }), { discrete: true });
  expect(paragraphs(editor)).toEqual(['before', 'after']);
  unregister();
});

test('Shift+Enter deliberately keeps a line break in the same paragraph', () => {
  const editor = setup();
  const unregister = registerRichText(editor);
  editor.update(() => editor.dispatchCommand(lexical.KEY_ENTER_COMMAND, { shiftKey: true, preventDefault() {} }), { discrete: true });
  expect(paragraphs(editor)).toEqual(['before\nafter']);
  unregister();
});

test.each(['\n', '\r\n'])('identical HTML/plain text preserves paragraph breaks (%j)', newline => {
  const editor = setup();
  const handler = loadPasteHandler();
  const text = `first${newline}second`;
  const clipboardData = { types: ['text/html', 'text/plain'], items: [], getData: type => type === 'text/html' || type === 'text/plain' ? text : '' };
  const preventDefault = () => { throw new Error('The native paste handler must handle plain text'); };
  editor.update(() => {
    expect(handler({ clipboardData, preventDefault })).toBe(false);
    $insertDataTransferForRichText(clipboardData, lexical.$getSelection(), editor);
  }, { discrete: true });
  expect(paragraphs(editor)).toEqual(['beforefirst', 'secondafter']);
});

test('plain-text paste preserves empty paragraphs', () => {
  const editor = setup();
  const handler = loadPasteHandler();
  const clipboardData = { types: ['text/plain'], items: [], getData: type => type === 'text/plain' ? 'first\n\nsecond' : '' };
  editor.update(() => {
    expect(handler({ clipboardData })).toBe(false);
    $insertDataTransferForRichText(clipboardData, lexical.$getSelection(), editor);
  }, { discrete: true });
  expect(paragraphs(editor)).toEqual(['beforefirst', '', 'secondafter']);
});

test('native Lexical clipboard data keeps text and formatting while dropping unsafe CSS', () => {
  const editor = setup();
  const handler = loadPasteHandler(editor);
  const node = { type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'pasted', style: 'position:fixed;color:rgb(1, 2, 3)', mode: 'normal', format: 1, detail: 0 }], format: '', indent: 0, direction: null };
  const clipboardData = { types: ['application/x-lexical-editor'], getData: type => type === 'application/x-lexical-editor' ? JSON.stringify({ namespace: 'test', nodes: [node] }) : 'pasted' };
  editor.update(() => expect(handler({ clipboardData, preventDefault() {} })).toBe(true), { discrete: true });
  const saved = JSON.stringify(editor.getEditorState().toJSON());
  expect(saved).not.toContain('position');
  expect(saved).toContain('color: rgb(1, 2, 3);');
  expect(paragraphs(editor).join('')).toBe('beforepastedafter');
});

test.each(['heading', 'unknown'])('unsafe %s clipboard nodes fall back to plain text without damaging surrounding content', type => {
  const editor = setup();
  const handler = loadPasteHandler(editor);
  const clipboardData = { types: ['application/x-lexical-editor'], getData: format => format === 'application/x-lexical-editor'
    ? JSON.stringify({ namespace: 'test', nodes: [{ type, version: 1, tag: 'script', children: [] }] }) : 'safe fallback' };
  editor.update(() => expect(handler({ clipboardData, preventDefault() {} })).toBe(true), { discrete: true });
  expect(paragraphs(editor).join('')).toBe('beforesafe fallbackafter');
});

test('invalid native clipboard data without plain text never deletes the selected content', () => {
  const editor = setup();
  const handler = loadPasteHandler(editor);
  editor.update(() => lexical.$getRoot().getFirstChild().getFirstChild().select(0, 6), { discrete: true });
  const before = JSON.stringify(editor.getEditorState().toJSON());
  const clipboardData = { types: ['application/x-lexical-editor'], getData: type => type === 'application/x-lexical-editor' ? 'invalid JSON' : '' };
  editor.update(() => expect(handler({ clipboardData, preventDefault() {} })).toBe(true), { discrete: true });
  expect(JSON.stringify(editor.getEditorState().toJSON())).toBe(before);
});

test('pasting into equation and music inputs leaves their native input handling intact', () => {
  const editor = setup();
  const handler = loadPasteHandler(editor, { isDOMNode: () => true, isSelectionCapturedInDecoratorInput: () => true });
  const before = JSON.stringify(editor.getEditorState().toJSON());
  editor.update(() => expect(handler({ target: {}, clipboardData: { types: ['application/x-lexical-editor'] } })).toBe(false), { discrete: true });
  expect(JSON.stringify(editor.getEditorState().toJSON())).toBe(before);
});
