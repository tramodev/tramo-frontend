import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const lexical = require('lexical');
function load(path, overrides = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => overrides[name] ?? require(name) });
  return exports;
}
const title = load('app/editor/nodes/TitleNode.ts');
const plugin = load('app/editor/plugins/TitlePlugin.tsx', {
  '@/app/editor/nodes/TitleNode': title, react: { useEffect() {} }, '@lexical/react/LexicalComposerContext': {},
});
const { serializeNoteContent } = load('app/editor/note-content.ts', { '@/app/editor/styleConfig': {} });

function setup(build) {
  const editor = lexical.createEditor({ namespace: 'title-test', nodes: [title.TitleNode], onError: error => { throw error; } });
  plugin.registerTitle(editor);
  if (build) editor.update(build, { discrete: true });
  const blocks = () => editor.getEditorState().read(() => lexical.$getRoot().getChildren().map(node => [node.getType(), node.getTextContent()]));
  const dispatch = (command, payload) => {
    let handled;
    editor.update(() => { handled = editor.dispatchCommand(command, payload); }, { discrete: true });
    return handled;
  };
  const selection = () => editor.getEditorState().read(() => {
    const point = lexical.$getSelection().anchor;
    return [point.getNode().getTopLevelElement().getType(), point.offset];
  });
  return { editor, blocks, dispatch, selection };
}
const text = value => lexical.$createTextNode(value);
const paragraph = value => lexical.$createParagraphNode().append(text(value));
const titleNode = value => title.$createTitleNode().append(text(value));

test('the title is always the single first block, followed by a body block', () => {
  expect(setup(() => lexical.$getRoot().append(paragraph('Body'))).blocks()).toEqual([['note-title', ''], ['paragraph', 'Body']]);
  expect(setup(() => lexical.$getRoot().append(paragraph('Body'), titleNode('Moved'))).blocks()).toEqual([['note-title', 'Moved'], ['paragraph', 'Body']]);
  expect(setup(() => lexical.$getRoot().append(titleNode('First'), titleNode('Second'))).blocks()).toEqual([['note-title', 'First'], ['paragraph', 'Second']]);
  expect(setup(() => lexical.$getRoot().append(titleNode('Alone'))).blocks()).toEqual([['note-title', 'Alone'], ['paragraph', '']]);
});

test('title text is plain, single line and capped like the API', () => {
  const s = setup(() => {
    const bold = text('Bold').toggleFormat('bold');
    lexical.$getRoot().append(title.$createTitleNode().append(bold, lexical.$createLineBreakNode(), text('x'.repeat(300))), paragraph('Body'));
  });
  s.editor.getEditorState().read(() => {
    const node = lexical.$getRoot().getFirstChild();
    expect(node.getChildren().every(child => child.getType() === 'text' && child.getFormat() === 0)).toBe(true);
    expect(node.getTextContent()).toHaveLength(255);
    expect(node.getTextContent().startsWith('Bold x')).toBe(true);
  });
});

test('updates from collaborators or the shared undo stack are never rewritten locally', () => {
  for (const tag of ['collaboration', 'historic']) {
    const s = setup();
    s.editor.update(() => lexical.$getRoot().append(titleNode('A'), titleNode('B')), { discrete: true, tag });
    expect(s.blocks()).toEqual([['note-title', 'A'], ['note-title', 'B']]);
  }
});

test('Enter leaves the title for the start of the body', () => {
  const s = setup(() => {
    lexical.$getRoot().append(titleNode('Title'), paragraph('Body'));
    lexical.$getRoot().getFirstChild().getFirstChild().select(2, 2);
  });
  let prevented = false;
  expect(s.dispatch(lexical.KEY_ENTER_COMMAND, { preventDefault: () => { prevented = true; } })).toBe(true);
  expect(prevented).toBe(true);
  expect(s.selection()).toEqual(['paragraph', 0]);
  expect(s.blocks()).toEqual([['note-title', 'Title'], ['paragraph', 'Body']]);
});

test('deleting across the title edge never merges the body into the title', () => {
  const s = setup(() => {
    lexical.$getRoot().append(titleNode('Title'), paragraph('Body'));
    lexical.$getRoot().getLastChild().getFirstChild().select(0, 0);
  });
  expect(s.dispatch(lexical.DELETE_CHARACTER_COMMAND, true)).toBe(true);
  expect(s.blocks()).toEqual([['note-title', 'Title'], ['paragraph', 'Body']]);
  expect(s.selection()).toEqual(['note-title', 5]);
  expect(s.dispatch(lexical.DELETE_CHARACTER_COMMAND, false)).toBe(true);
  expect(s.blocks()).toEqual([['note-title', 'Title'], ['paragraph', 'Body']]);
  const empty = setup(() => {
    lexical.$getRoot().append(titleNode('Title'), lexical.$createParagraphNode(), paragraph('Next'));
    lexical.$getRoot().getChildAtIndex(1).select();
  });
  expect(empty.dispatch(lexical.DELETE_CHARACTER_COMMAND, true)).toBe(true);
  expect(empty.blocks()).toEqual([['note-title', 'Title'], ['paragraph', 'Next']]);
});

test('formatting and indentation are refused inside the title but not in the body', () => {
  const s = setup(() => {
    lexical.$getRoot().append(titleNode('Title'), paragraph('Body'));
    lexical.$getRoot().getFirstChild().getFirstChild().select(0, 5);
  });
  expect(s.dispatch(lexical.FORMAT_TEXT_COMMAND, 'bold')).toBe(true);
  expect(s.dispatch(lexical.INDENT_CONTENT_COMMAND)).toBe(true);
  s.editor.update(() => lexical.$getRoot().getLastChild().getFirstChild().select(0, 4), { discrete: true });
  expect(s.dispatch(lexical.INDENT_CONTENT_COMMAND)).toBe(false);
});

test('stored content never contains the title', () => {
  const s = setup(() => lexical.$getRoot().append(titleNode('Title'), paragraph('Body')));
  const saved = JSON.parse(serializeNoteContent(s.editor.getEditorState().toJSON()));
  expect(saved.root.children.map(child => child.type)).toEqual(['paragraph']);
});
