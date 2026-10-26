import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const lexical = require('lexical');
function load(modules = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/DraggableBlockPlugin.tsx', 'utf8') + '\nexport { $moveBlock };', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => modules[name] ?? (name === 'lexical' ? lexical : {}) });
  return exports;
}
const exports = load();

function setup() {
  const editor = lexical.createEditor({ namespace: 'move-block-test', onError: error => { throw error; } });
  const keys = [];
  editor.update(() => {
    for (const text of ['First', 'Second', 'Third']) {
      const block = lexical.$createParagraphNode().append(lexical.$createTextNode(text));
      lexical.$getRoot().append(block);
      keys.push(block.getKey());
    }
    lexical.$getNodeByKey(keys[1]).selectEnd();
  }, { discrete: true });
  const move = direction => {
    let result;
    editor.update(() => { result = exports.$moveBlock(direction); }, { discrete: true });
    return result;
  };
  const content = () => editor.getEditorState().read(() => lexical.$getRoot().getChildren().map(node => node.getTextContent()));
  return { editor, keys, move, content };
}

test('moving a block keeps its content, key and caret in the same block', () => {
  const s = setup();
  expect(s.move('up')).toBe(true);
  expect(s.content()).toEqual(['Second', 'First', 'Third']);
  s.editor.getEditorState().read(() => {
    expect(lexical.$getSelection().anchor.getNode().getTopLevelElement().getKey()).toBe(s.keys[1]);
  });
  expect(s.move('down')).toBe(true);
  expect(s.content()).toEqual(['First', 'Second', 'Third']);
});

test('the first and last block cannot move past the document boundaries', () => {
  const s = setup();
  s.move('up');
  expect(s.move('up')).toBe(false);
  s.move('down'); s.move('down');
  expect(s.move('down')).toBe(false);
  expect(s.content()).toEqual(['First', 'Third', 'Second']);
});

test('node selections can move blocks without replacing the selection', () => {
  const s = setup();
  s.editor.update(() => {
    const selection = lexical.$createNodeSelection();
    selection.add(s.keys[1]);
    lexical.$setSelection(selection);
  }, { discrete: true });
  expect(s.move('down')).toBe(true);
  expect(s.content()).toEqual(['First', 'Third', 'Second']);
  s.editor.getEditorState().read(() => {
    expect(lexical.$getSelection().getNodes().map(node => node.getKey())).toEqual([s.keys[1]]);
  });
});

test('missing selections leave the document unchanged', () => {
  const s = setup();
  s.editor.update(() => lexical.$setSelection(null), { discrete: true });
  expect(s.move('up')).toBe(false);
  expect(s.content()).toEqual(['First', 'Second', 'Third']);
});


test('Alt+Shift+Arrow moves the block before native arrow navigation', () => {
  const s = setup();
  const plugin = load({
    react: { useEffect: fn => fn(), useRef: value => ({ current: value }) },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [s.editor] },
    '@lexical/utils': { mergeRegister: (...callbacks) => () => callbacks.forEach(fn => fn()) },
  });
  plugin.default({ anchorElem: { addEventListener() {}, removeEventListener() {} } });
  let prevented = false;
  s.editor.update(() => s.editor.dispatchCommand(lexical.KEY_DOWN_COMMAND, {
    key: 'ArrowUp', altKey: true, shiftKey: true, metaKey: false, ctrlKey: false,
    preventDefault: () => { prevented = true; },
  }), { discrete: true });
  expect(prevented).toBe(true);
  expect(s.content()).toEqual(['Second', 'First', 'Third']);
});
