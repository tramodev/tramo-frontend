import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const lexical = require('lexical');
const list = require('@lexical/list');
const code = require('@lexical/code');

function tab(kind, shiftKey = false) {
  const editor = lexical.createEditor({ namespace: 'tab-navigation', nodes: [code.CodeNode, list.ListNode, list.ListItemNode], onError: error => { throw error; } });
  editor.update(() => {
    const text = lexical.$createTextNode('text');
    const block = kind === 'code' ? code.$createCodeNode() : kind === 'list' ? list.$createListNode('bullet') : lexical.$createParagraphNode();
    block.append(kind === 'list' ? list.$createListItemNode().append(text) : text);
    lexical.$getRoot().append(block); text.selectEnd();
    if (kind === 'node') { const selection = lexical.$createNodeSelection(); selection.add(text.getKey()); lexical.$setSelection(selection); }
  }, { discrete: true });
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/ListTabPlugin.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => ({ react: { useEffect: fn => fn() }, '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [editor] } })[name] ?? require(name) });
  exports.default();
  let prevented = false, indentation;
  editor.registerCommand(lexical.KEY_TAB_COMMAND, event => { event.preventDefault(); return true; }, lexical.COMMAND_PRIORITY_EDITOR);
  for (const [command, direction] of [[lexical.INDENT_CONTENT_COMMAND, 'indent'], [lexical.OUTDENT_CONTENT_COMMAND, 'outdent']]) editor.registerCommand(command, () => { indentation = direction; return true; }, lexical.COMMAND_PRIORITY_EDITOR);
  editor.update(() => editor.dispatchCommand(lexical.KEY_TAB_COMMAND, { shiftKey, preventDefault: () => { prevented = true; } }), { discrete: true });
  return { prevented, indentation };
}

test.each([false, true])('Tab keeps native focus navigation in paragraphs (shift=%s)', shift => {
  expect(tab('paragraph', shift).prevented).toBe(false);
});
test('code blocks retain tab indentation', () => {
  expect(tab('code').prevented).toBe(true);
});
test.each([[false, 'indent'], [true, 'outdent']])('lists retain indentation (shift=%s)', (shift, direction) => {
  expect(tab('list', shift)).toEqual({ prevented: true, indentation: direction });
});


test('node selections also allow native focus navigation', () => {
  expect(tab('node').prevented).toBe(false);
});


function enterFence(text, { shiftKey = false, offset = text.length } = {}) {
  const editor = lexical.createEditor({ namespace: 'code-enter', nodes: [code.CodeNode], onError: error => { throw error; } });
  editor.update(() => {
    const node = lexical.$createTextNode(text);
    lexical.$getRoot().append(lexical.$createParagraphNode().append(node));
    node.select(offset, offset);
  }, { discrete: true });
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/CodeBlockGuardPlugin.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => ({ react: { useEffect: fn => fn() },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [editor] },
    './codeBlockGuard': { $isSelectionInCode: () => false },
  })[name] ?? require(name) });
  exports.CodeBlockGuardPlugin();
  let handled;
  editor.update(() => { handled = editor.dispatchCommand(lexical.KEY_ENTER_COMMAND, { shiftKey, preventDefault() {} }); }, { discrete: true });
  return { handled, node: editor.getEditorState().toJSON().root.children[0] };
}

test.each(['```', '```javascript'])('Enter creates a code block for %s', text => {
  expect(enterFence(text)).toMatchObject({ handled: true, node: { type: 'code', language: text === '```' ? 'plain' : 'javascript' } });
});

test('code fence conversion respects Shift+Enter, caret position and known languages', () => {
  expect(enterFence('```', { shiftKey: true }).handled).toBe(false);
  expect(enterFence('```', { offset: 1 }).handled).toBe(false);
  expect(enterFence('```unknown-language').handled).toBe(false);
});
