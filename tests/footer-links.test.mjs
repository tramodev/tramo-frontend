import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('footer links to available pages, legal documents, contact email and X', () => {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const code = ts.transpileModule(readFileSync('components/layout/footer.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, {
    exports,
    require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : {},
  });
  const nodes = [];
  const visit = node => {
    if (!node?.props) return;
    nodes.push(node);
    [node.props.children].flat().forEach(visit);
  };
  visit(exports.Footer());
  expect(nodes.find(node => node.props.children === 'About').props.href).toBe('/about');
  expect(nodes.find(node => node.props.children === 'Blog').props.href).toBe('/blog');
  expect(nodes.find(node => node.props.children === 'Changelog').props.href).toBe('/changelog');
  expect(nodes.find(node => node.props.children === 'Wiki').props.href).toBe('/wiki');
  expect(nodes.find(node => node.props.children === 'Roadmap').props.href).toBe('/roadmap');
  expect(nodes.find(node => node.props.children === 'Contact').props.href).toBe('mailto:contact@tramo.dev');
  const social = nodes.find(node => node.props.href === 'https://x.com/tramodev');
  expect(social.props.target).toBe('_blank');
  expect(social.props.rel).toBe('noopener noreferrer');
  expect(nodes.find(node => node.props.children === 'Privacy Policy').props.href).toBe('/privacy');
  expect(nodes.find(node => node.props.children === 'Terms of Service').props.href).toBe('/tos');
});
