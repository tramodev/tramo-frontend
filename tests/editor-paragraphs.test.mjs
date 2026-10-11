import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
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

function loadPasteHandler() {
  let handler;
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/PastePlugin.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: name => {
      if (name === 'react') return { useEffect: effect => effect() };
      if (name === '@lexical/react/LexicalComposerContext') return { useLexicalComposerContext: () => [{
        registerCommand: (_command, callback) => { handler = callback; return () => {}; },
      }] };
      return require(name);
    },
    DOMParser: class { constructor() { throw new Error('Plain text must not be parsed as HTML'); } },
  });
  exports.default();
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
