import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

test('overview keeps every trail in one scroll and selects the clicked trail', () => {
  const exports = {};
  const itemLink = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/itemLink.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: itemLink });
  const source = ts.transpileModule(readFileSync('components/editor/overview-reader.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(source, { exports, require: name => ({
    react: { useLayoutEffect() {}, useRef: () => ({ current: null }), useState: value => [value, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/app/editor/plugins/itemLink': itemLink,
    '@/components/editor/trail-connector': { TrailConnector: 'TrailConnector' },
  })[name] ?? {} });
  const trails = [
    { id: 'a', title: 'First', description: '', itemIds: ['shared'], steps: [{ itemId: 'shared' }], version: 1, forkedFrom: null },
    { id: 'b', title: 'Second', description: '', itemIds: ['shared'], steps: [{ itemId: 'shared' }], version: 1, forkedFrom: null },
    { id: 'c', title: 'Third', description: '', itemIds: [], steps: [], version: 1, forkedFrom: null },
  ];
  const selections = [];
  const nodes = flatten(exports.OverviewReader({ trails, activeTrailId: 'b', items: { shared: { id: 'shared', title: 'Shared' } }, selectedItemId: 'shared', onSelectItem: (...args) => selections.push(args) }));
  expect(nodes.filter(node => node.type === 'h1').map(node => node.props.children)).toEqual(['First', 'Second', 'Third']);
  expect(nodes.some(node => node.props.children === 'A trail through the Memex')).toBe(false);
  expect(nodes.find(node => node.type === 'div').props.className).toContain('overflow-y-auto');
  expect(nodes.filter(node => node.type === 'section')).toHaveLength(3);
  expect(nodes.some(node => node.type === 'p' && node.props.children === 'No notes in this trail.')).toBe(true);
  nodes.filter(node => node.type === 'button').at(1).props.onClick();
  expect(selections[0][1]).toBe('b');
});

test('overview shows mentions from loaded content and previews', () => {
  const exports = {};
  const itemLink = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/itemLink.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: itemLink });
  runInNewContext(ts.transpileModule(readFileSync('components/editor/overview-reader.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => ({
    react: { useLayoutEffect() {}, useRef: () => ({ current: null }), useState: value => [value, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/app/editor/plugins/itemLink': itemLink,
    '@/components/editor/trail-connector': { TrailConnector: 'TrailConnector' },
  })[name] ?? {} });
  const trails = [{ id: 'a', title: 'First', description: '', itemIds: ['source'], steps: [{ itemId: 'source' }], version: 1, forkedFrom: null }];
  const items = { source: { id: 'source', title: 'Source', content: null }, target: { id: 'target', title: 'Target' } };
  const props = { trails, items, mapPreviews: { source: { text: '', linkedItemIds: ['target'] } }, onSelectItem() {} };
  let nodes = flatten(exports.OverviewReader(props));
  expect(nodes.some(node => node.type === 'span' && node.props.children === '@Target')).toBe(true);
  items.source.content = JSON.stringify({ root: { children: [{ type: 'link', rel: 'tramo-idea:target' }] } });
  nodes = flatten(exports.OverviewReader({ ...props, mapPreviews: { source: { text: '', linkedItemIds: [] } } }));
  expect(nodes.some(node => node.type === 'span' && node.props.children === '@Target')).toBe(true);
});
