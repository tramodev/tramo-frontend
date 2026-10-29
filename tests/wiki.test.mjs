import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(path, modules = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => modules[name] ?? {} });
  return exports;
}

const content = load('app/wiki/content.ts');
const screenshots = load('app/wiki/screenshots.ts');
const jsx = (type, props) => ({ type, props });
const page = load('app/wiki/[slug]/page.tsx', {
  '@/app/wiki/content': content,
  '@/app/wiki/screenshots': screenshots,
  'next/image': { default: 'img' },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/navigation': { notFound: () => { throw new Error('not found'); } },
});

test('wiki categories include every topic exactly once', () => {
  const ids = content.GROUPS.flatMap(group => group.sections.map(section => section.id));
  expect(ids).toEqual(content.SECTIONS.map(section => section.id));
  expect(new Set(ids).size).toBe(ids.length);
  expect(content.SECTIONS.every(section => section.features.length > 0)).toBe(true);
});

test('wiki generates a page and canonical URL for every topic', async () => {
  expect(page.generateStaticParams()).toEqual(content.SECTIONS.map(section => ({ slug: section.id })));
  for (const section of content.SECTIONS) {
    const metadata = await page.generateMetadata({ params: Promise.resolve({ slug: section.id }) });
    expect(metadata.alternates.canonical).toBe(`/wiki/${section.id}`);
  }
});

test('unknown wiki topics return not found', async () => {
  const props = { params: Promise.resolve({ slug: 'missing-topic' }) };
  await expect(page.generateMetadata(props)).rejects.toThrow('not found');
  await expect(page.default(props)).rejects.toThrow('not found');
});

test.each([['projects', 8], ['notes-and-trails', 13], ['writing', 16]])('%s illustrates every feature with accessible local screenshots without changing other topics', async (slug, count) => {
  const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : !node?.props ? [] : [node, ...nodes(node.props.children)];
  const article = await page.default({ params: Promise.resolve({ slug }) });
  const images = nodes(article).filter(node => node.type === 'img');
  expect(images).toHaveLength(count);
  const section = content.SECTIONS.find(section => section.id === slug);
  expect(Object.keys(screenshots.WIKI_SCREENSHOTS[slug])).toEqual(section.features.map(([title]) => title));
  for (const image of images) {
    expect(image.props.alt.length).toBeGreaterThan(10);
    expect(image.props.width).toBeGreaterThan(0);
    expect(image.props.height).toBeGreaterThan(0);
    expect(readFileSync(`public${image.props.src}`).subarray(0, 2).toString('hex')).toBe('ffd8');
  }
  const other = await page.default({ params: Promise.resolve({ slug: 'images-and-blocks' }) });
  expect(nodes(other).filter(node => node.type === 'img')).toHaveLength(0);
});

test('wiki navigation opens the current category and marks only the selected page', () => {
  const jsx = (type, props) => ({ type, props });
  const { WikiNav } = load('components/layout/wiki-nav.tsx', {
    '@/app/wiki/content': content,
    'next/navigation': { usePathname: () => '/wiki/publishing' },
    'next/link': { default: 'a' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  });
  const nodes = [];
  const visit = node => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node?.props) return;
    nodes.push(node);
    visit(node.props.children);
  };
  visit(WikiNav());
  const categories = nodes.filter(node => node.type === 'details');
  expect(categories).toHaveLength(content.GROUPS.length);
  expect(categories.filter(node => node.props.open)).toHaveLength(1);
  expect(categories.find(node => node.props.open).props.children[0].props.children).toContain('Sharing and community');
  const selected = nodes.filter(node => node.props['aria-current'] === 'page');
  expect(selected).toHaveLength(1);
  expect(selected[0].props.href).toBe('/wiki/publishing');
  expect(selected[0].props.className).toContain('bg-secondary');
});
