import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

function load(path, modules) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : name === 'next/server' ? { connection: async () => {} } : modules[name] ?? {},
  });
  return exports;
}

test('blog lists published API posts with working article links', async () => {
  const page = load('app/blog/page.tsx', {
    '@/lib/site-content': { getBlogPosts: async () => [{ slug: 'first-post', title: 'First post', category: 'Ideas', summary: 'Summary', publishedDate: '2026-10-15' }] },
    'next/link': { default: 'a' },
  });
  const nodes = flatten(await page.default());
  expect(page.metadata.alternates.canonical).toBe('/blog');
  expect(nodes.filter(node => node.type === 'h1')).toHaveLength(1);
  expect(nodes.filter(node => node.type === 'article')).toHaveLength(1);
  expect(nodes.filter(node => node.props.href).map(node => node.props.href)).toEqual(['/blog/first-post']);
  expect(nodes.some(node => node.props.children === 'Draft')).toBe(false);
});

test('blog has an honest empty state instead of exposing drafts', async () => {
  const page = load('app/blog/page.tsx', { '@/lib/site-content': { getBlogPosts: async () => [] } });
  const nodes = flatten(await page.default());
  expect(nodes.filter(node => node.type === 'article')).toHaveLength(0);
  expect(nodes.some(node => node.props.children === 'Articles coming soon.')).toBe(true);
});

test('blog article renders plain text and missing or unpublished posts return not found', async () => {
  let post = { slug: 'first-post', title: 'First post', summary: 'Summary', content: '<script>alert(1)</script>', category: 'Ideas', publishedDate: '2026-10-15' };
  const page = load('app/blog/[slug]/page.tsx', {
    '@/lib/site-content': { getBlogPost: async () => post },
    'next/navigation': { notFound: () => { throw new Error('not found'); } },
  });
  const props = { params: Promise.resolve({ slug: 'first-post' }) };
  expect((await page.generateMetadata(props)).alternates.canonical).toBe('/blog/first-post');
  const nodes = flatten(await page.default(props));
  expect(nodes.some(node => node.props.children === post.content)).toBe(true);
  expect(nodes.some(node => node.props.dangerouslySetInnerHTML)).toBe(false);
  post = null;
  await expect(page.generateMetadata(props)).rejects.toThrow('not found');
  await expect(page.default(props)).rejects.toThrow('not found');
});
