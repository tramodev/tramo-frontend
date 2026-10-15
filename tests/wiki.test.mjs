import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('wiki lists features with working topic anchors and identifies the unfinished guides', () => {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('app/wiki/page.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : {},
  });
  const nodes = [];
  const visit = node => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node?.props) return;
    nodes.push(node);
    visit(node.props.children);
  };
  visit(exports.default());
  const ids = nodes.filter(node => node.props.id).map(node => node.props.id);
  const topics = nodes.filter(node => node.type === 'a');
  expect(exports.metadata.alternates.canonical).toBe('/wiki');
  expect(nodes.filter(node => node.type === 'h1')).toHaveLength(1);
  expect(topics).toHaveLength(13);
  expect(topics.every(node => ids.includes(node.props.href.slice(1)))).toBe(true);
  expect(new Set(ids).size).toBe(ids.length);
  expect(nodes.filter(node => node.type === 'dt').length).toBeGreaterThanOrEqual(100);
  expect(nodes.filter(node => node.type === 'dt')).toHaveLength(nodes.filter(node => node.type === 'dd').length);
  expect(nodes.some(node => node.props.children === 'This is a feature index. Detailed guides and examples are still being written.')).toBe(true);
});
