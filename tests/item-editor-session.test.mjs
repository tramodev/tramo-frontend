import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const lexical = require('lexical');
const { createEmptyHistoryState } = require('@lexical/react/LexicalHistoryPlugin');
function registerHistory(editor, history, delay) {
  const plugin = {};
  let cleanup;
  runInNewContext(readFileSync('node_modules/@lexical/react/LexicalHistoryPlugin.dev.js', 'utf8'), {
    exports: plugin,
    require: name => name === 'react' ? { useMemo: calculate => calculate(), useEffect: effect => { cleanup = effect(); } }
      : name === '@lexical/react/LexicalComposerContext' ? { useLexicalComposerContext: () => [editor] } : require(name),
  });
  plugin.HistoryPlugin({ externalHistoryState: history, delay });
  return cleanup;
}
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/item-editor-session.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const make = () => lexical.createEditor({ namespace: 'session-test', onError: error => { throw error; } });
const text = editor => editor.getEditorState().read(() => lexical.$getRoot().getTextContent());
function change(editor, value) {
  editor.update(() => {
    const root = lexical.$getRoot();
    root.clear();
    root.append(lexical.$createParagraphNode().append(lexical.$createTextNode(value)));
  }, { discrete: true, tag: lexical.HISTORY_PUSH_TAG });
}
function command(editor, command) {
  editor.update(() => editor.dispatchCommand(command), { discrete: true });
}

test('content, undo and redo survive repeated editor destruction without retaining old editors', () => {
  const session = { undo: [], redo: [], previewUrls: new Set() };
  const first = make();
  const history = createEmptyHistoryState();
  const stop = registerHistory(first, history, 0);
  change(first, 'original'); change(first, 'first edit'); change(first, 'unsaved edit');
  exports.saveItemSession(session, first, history); stop();
  expect(session.undo.every(state => !('editor' in state))).toBe(true);
  expect(session.state).toBe(first.getEditorState());

  const second = make();
  second.setEditorState(session.state.clone(null));
  const restored = exports.restoreItemHistory(session, second);
  expect(restored.undoStack.every(entry => entry.editor === second)).toBe(true);
  const stopSecond = registerHistory(second, restored, 0);
  expect(text(second)).toBe('unsaved edit');
  command(second, lexical.UNDO_COMMAND);
  expect(text(second)).toBe('first edit');
  expect(text(first)).toBe('unsaved edit');
  exports.saveItemSession(session, second, restored); stopSecond();

  const third = make();
  third.setEditorState(session.state.clone(null));
  const thirdHistory = exports.restoreItemHistory(session, third);
  const stopThird = registerHistory(third, thirdHistory, 0);
  command(third, lexical.REDO_COMMAND);
  expect(text(third)).toBe('unsaved edit');
  command(third, lexical.UNDO_COMMAND); command(third, lexical.UNDO_COMMAND);
  expect(text(third)).toBe('original');
  stopThird();
});
