import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
const jsx = (type, props) => ({ type, props });
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
runInNewContext(ts.transpileModule(readFileSync('components/layout/footer.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: name => ({
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/link': { default: 'Link' },
  '@/components/layout/logo': { Wordmark: 'Wordmark' },
})[name] ?? {} });

test('footer shows the brand, social icons and copyright in order', () => {
  const nodes = flatten(exports.Footer());
  expect(nodes.find(node => node.type === 'Link').props.href).toBe('/');
  const github = nodes.find(node => node.type === 'a');
  expect(github.props.href).toBe('https://github.com/tramodev');
  expect(github.props.rel).toBe('noopener noreferrer');
  for (const name of ['Discord', 'Twitter']) {
    expect(nodes.find(node => node.props['aria-label'] === `${name} (coming soon)`).props['aria-disabled']).toBe('true');
  }
  const copyright = nodes.find(node => node.type === 'p');
  expect(copyright.props.children.join('')).toContain(`${new Date().getFullYear()} Tramo Inc. All rights reserved.`);
  expect(nodes.findIndex(node => node.type === 'Wordmark')).toBeLessThan(nodes.indexOf(github));
  expect(nodes.indexOf(github)).toBeLessThan(nodes.indexOf(copyright));
});

test('future footer pages are listed without broken links', () => {
  const nodes = flatten(exports.Footer());
  const pages = nodes.filter(node => node.props.role === 'link' && node.props.title === 'Coming soon');
  expect(pages.map(node => node.props.children[0])).toEqual(['About', 'Blog', 'Contact', 'Wiki', 'Changelog', 'Roadmap', 'Privacy Policy', 'Terms of Service']);
  expect(pages.every(node => node.props['aria-disabled'] === 'true' && !node.props.href)).toBe(true);
  expect(nodes.filter(node => node.type === 'ul')).toHaveLength(3);
  expect(nodes.filter(node => node.type === 'h2').map(node => node.props.children)).toEqual(['Company', 'Product', 'Resources']);
});
