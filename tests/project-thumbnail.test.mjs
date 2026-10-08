import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
const jsx = (type, props) => ({ type, props });
runInNewContext(ts.transpileModule(readFileSync('components/project/project-thumbnail.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: name => ({
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/image': { default: 'Image' },
  '@/components/shared/author-avatar': { initial: title => title[0] },
})[name] ?? {} });

const textOf = node => Array.isArray(node) ? node.map(textOf).join(' ') : node?.props ? textOf(node.props.children) : typeof node === 'string' ? node : '';
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
const renderGraph = graph => {
  const element = exports.ProjectThumbnail({ thumbnailImageUrl: null, thumbnailGraph: graph, title: 'Project' });
  return element.type(element.props).props.children;
};

test('graph thumbnail shows every trail and note appearance with static connections', () => {
  const graph = {
    trails: [{ id: 'first', title: 'First', itemIds: ['shared'] }, { id: 'second', title: 'Second', itemIds: ['shared', 'other'] }],
    items: [{ id: 'shared', title: 'Shared', associations: [{ id: 'link', targetId: 'other' }] }, { id: 'other', title: 'Other', associations: [] }],
  };
  const svg = renderGraph(graph);
  const nodes = flatten(svg);
  expect(svg.type).toBe('svg');
  expect(nodes.filter(node => node.type === 'rect')).toHaveLength(5);
  expect(nodes.filter(node => node.type === 'path' && node.props.strokeDasharray)).toHaveLength(1);
  expect(nodes.filter(node => node.type === 'path' && !node.props.strokeDasharray)).toHaveLength(1);
  expect(textOf(svg).match(/Shared/g)).toHaveLength(2);
  expect(textOf(svg)).toContain('First');
  expect(textOf(svg)).toContain('Second');
  expect(textOf(svg)).toContain('Other');
});

test('graph thumbnail renders a response with the previous single-trail format', () => {
  const graph = {
    trailId: 'first', trailTitle: 'First', itemIds: ['note'],
    items: [{ id: 'note', title: 'Note', associations: [] }],
  };
  const svg = renderGraph(graph);
  expect(flatten(svg).filter(node => node.type === 'rect')).toHaveLength(2);
  expect(textOf(svg)).toContain('First');
  expect(textOf(svg)).toContain('Note');
});

test('static thumbnail keeps every trail when the graph has several', () => {
  const graph = {
    trails: ['One', 'Two', 'Three', 'Four', 'Five'].map((title, index) => ({ id: String(index), title, itemIds: [] })),
    items: [],
  };
  const svg = renderGraph(graph);
  expect(flatten(svg).filter(node => node.type === 'rect')).toHaveLength(5);
  expect(svg.props.viewBox).toBe('0 0 996 132');
  for (const title of ['One', 'Two', 'Three', 'Four', 'Five']) expect(textOf(svg)).toContain(title);
});
