import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const lexical = require('lexical');
const { registerHistory, createEmptyHistoryState } = require('@lexical/history');

function load(path, overrides = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => overrides[name] ?? require(name) });
  return exports;
}

const equations = load('app/editor/nodes/EquationNode.tsx', { '../plugins/EquationComponent': {} });
const music = load('app/editor/nodes/MusicNode.tsx', { '../plugins/MusicComponent': {} });
const caret = load('app/editor/plugins/decoratorCaret.ts');
const { serializeNoteContent } = load('app/editor/note-content.ts', { '@/app/editor/styleConfig': {} });

function setup(kind, inline = false, previousSelection = false) {
  const editor = lexical.createEditor({ namespace: 'decorator-insertion', nodes: [equations.EquationNode, music.MusicNode], onError: error => { throw error; } });
  let originalKey;
  editor.update(() => {
    const original = equations.$createEquationNode({ equation: 'x^2 + y^2', inline: false });
    originalKey = original.getKey();
    lexical.$getRoot().append(original, lexical.$createParagraphNode());
  }, { discrete: true });
  const unregister = registerHistory(editor, createEmptyHistoryState(), 300);
  const plugin = load(`app/editor/plugins/${kind === 'Music' ? 'Music' : 'Equations'}Plugin.tsx`, {
    react: { useEffect: fn => fn() },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [editor] },
    '../nodes/EquationNode': equations, '../nodes/MusicNode': music,
    './codeBlockGuard': { $isSelectionInCode: () => false },
    '@/app/editor/plugins/decoratorCaret': caret,
  });
  plugin.default();
  const insert = () => editor.update(() => {
    if (previousSelection) lexical.$setSelection(null);
    editor.dispatchCommand(kind === 'Music' ? plugin.INSERT_MUSIC_COMMAND : plugin.INSERT_EQUATION_COMMAND,
      kind === 'Music' ? undefined : { equation: '', inline });
  }, { discrete: true });
  const select = () => editor.update(() => {
    const selection = lexical.$createNodeSelection(); selection.add(originalKey); lexical.$setSelection(selection);
  }, { discrete: true });
  const original = () => editor.getEditorState().read(() => lexical.$getNodeByKey(originalKey)?.exportJSON());
  const discard = () => editor.update(() => {
    const nodes = lexical.$nodesOfType(kind === 'Music' ? music.MusicNode : equations.EquationNode);
    nodes.filter(node => node.getKey() !== originalKey).forEach(node => node.remove());
  }, { discrete: true, tag: lexical.HISTORY_PUSH_TAG });
  const undo = () => editor.update(() => editor.dispatchCommand(lexical.UNDO_COMMAND, undefined), { discrete: true });
  return { editor, select, insert, original, discard, undo, unregister, inserted: () => editor.getEditorState().read(() =>
    lexical.$nodesOfType(kind === 'Music' ? music.MusicNode : equations.EquationNode)
      .filter(node => node.getKey() !== originalKey).map(node => node.exportJSON())) };
}

for (const [kind, inline] of [['Music', false], ['Equation', false], ['Equation', true]]) {
  test.each([false, true])(`inserting empty ${kind} (inline=${inline}, previous selection=%s) preserves the selected equation through discard, reload and undo`, previousSelection => {
    const s = setup(kind, inline, previousSelection);
    s.select(); s.insert();
    const expected = { type: 'equation', equation: 'x^2 + y^2', inline: false };
    expect(s.original()).toMatchObject(expected);
    expect(s.inserted()).toEqual([expect.objectContaining(kind === 'Music'
      ? { type: 'music', abc: '' } : { type: 'equation', equation: '', inline })]);
    const saved = serializeNoteContent(s.editor.getEditorState().toJSON());
    const reloaded = lexical.createEditor({ nodes: [equations.EquationNode, music.MusicNode], onError: error => { throw error; } });
    reloaded.setEditorState(reloaded.parseEditorState(saved));
    reloaded.getEditorState().read(() => expect(lexical.$nodesOfType(equations.EquationNode).map(node => node.exportJSON())).toEqual([expect.objectContaining(expected)]));
    s.discard();
    expect(s.original()).toMatchObject(expected);
    s.undo(); expect(s.original()).toMatchObject(expected);
    s.undo(); expect(s.original()).toMatchObject(expected);
    s.unregister();
  });
}


test.each(['Music', 'Equation'])('%s insertion still replaces a text range without changing other blocks', kind => {
  const s = setup(kind);
  s.editor.update(() => {
    const text = lexical.$createTextNode('replace this');
    lexical.$getRoot().getLastChild().append(text);
    text.select(0, text.getTextContentSize());
  }, { discrete: true });
  s.insert();
  expect(s.original()).toMatchObject({ equation: 'x^2 + y^2' });
  expect(s.inserted()).toHaveLength(1);
  s.editor.getEditorState().read(() => expect(lexical.$getRoot().getTextContent()).not.toContain('replace this'));
  s.unregister();
});
