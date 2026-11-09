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
  }).outputText, { exports, URL, require: name => overrides[name] ?? require(name) });
  return exports;
}
const embed = load('app/editor/plugins/embed.ts');
const nodes = [
  load('app/editor/nodes/ImageNode.tsx', { '../plugins/ImageComponent': { default: 'ImageComponent' } }).ImageNode,
  load('app/editor/nodes/EquationNode.tsx', { '../plugins/EquationComponent': { default: 'EquationComponent' } }).EquationNode,
  load('app/editor/nodes/MusicNode.tsx', { '../plugins/MusicComponent': { default: 'MusicComponent' } }).MusicNode,
  load('app/editor/nodes/EmbedNode.tsx', { '@/app/editor/plugins/embed': embed }).EmbedNode,
  load('app/editor/nodes/TitleNode.ts').TitleNode,
];

test.each(nodes.map(node => [node.getType(), node]))('%s can be constructed without arguments, as Yjs collaboration requires', (_type, Node) => {
  const editor = lexical.createEditor({ namespace: 'test', nodes, onError: error => { throw error; } });
  let result;
  editor.update(() => {
    try {
      const node = new Node();
      result = { type: node.getType(), json: node.exportJSON().type };
    } catch (error) {
      result = { error: error.message };
    }
  }, { discrete: true });
  expect(result).toEqual({ type: Node.getType(), json: Node.getType() });
});
