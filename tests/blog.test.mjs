import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('blog lists sample drafts without linking to nonexistent articles', () => {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('app/blog/page.tsx', 'utf8'), {
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
  expect(exports.metadata.alternates.canonical).toBe('/blog');
  expect(nodes.filter(node => node.type === 'h1')).toHaveLength(1);
  expect(nodes.filter(node => node.type === 'article')).toHaveLength(3);
  expect(nodes.filter(node => node.props.children === 'Draft')).toHaveLength(3);
  expect(nodes.some(node => node.props.children === 'Sample posts · Articles coming soon')).toBe(true);
  expect(nodes.filter(node => node.props.href)).toHaveLength(0);
});
