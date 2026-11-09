import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lexical = require('lexical');
const richText = require('@lexical/rich-text');

class BlockNode extends lexical.DecoratorNode {
  static getType() { return 'block'; }
  static clone(node) { return new BlockNode(node.__key); }
  createDOM() { return {}; }
  updateDOM() { return false; }
  decorate() { return null; }
  isInline() { return false; }
}

test('deleting a selected block decorator keeps the text before it', () => {
  const editor = lexical.createEditor({ namespace: 'decorator-delete', nodes: [BlockNode], onError: error => { throw error; } });
  richText.registerRichText(editor);
  editor.update(() => {
    const block = new BlockNode();
    lexical.$getRoot().append(lexical.$createParagraphNode().append(lexical.$createTextNode('abc')), block, lexical.$createParagraphNode().append(lexical.$createTextNode('xyz')));
    const selection = lexical.$createNodeSelection();
    selection.add(block.getKey());
    lexical.$setSelection(selection);
  }, { discrete: true });
  editor.registerCommand(lexical.KEY_BACKSPACE_COMMAND, () => { lexical.$getSelection().deleteNodes(); return true; }, lexical.COMMAND_PRIORITY_LOW);
  editor.update(() => editor.dispatchCommand(lexical.KEY_BACKSPACE_COMMAND, { preventDefault() {}, target: null }), { discrete: true });
  expect(editor.getEditorState().read(() => lexical.$getRoot().getChildren().map(node => node.getTextContent()))).toEqual(['abc', 'xyz']);
});

test.each(['MusicComponent', 'EquationComponent', 'ImageComponent'])('%s consumes the delete key after removing the selection', name => {
  expect(readFileSync(`app/editor/plugins/${name}.tsx`, 'utf8')).toContain('selection.deleteNodes();\n      return true;');
});
