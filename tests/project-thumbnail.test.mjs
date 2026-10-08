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

test('graph thumbnail includes every trail and one copy of a shared note', () => {
  const graph = {
    trails: [{ id: 'first', title: 'First', itemIds: ['shared'] }, { id: 'second', title: 'Second', itemIds: ['shared', 'other'] }],
    items: [{ id: 'shared', title: 'Shared', associations: [] }, { id: 'other', title: 'Other', associations: [] }],
  };
  const thumbnail = exports.ProjectThumbnail({ thumbnailImageUrl: null, thumbnailGraph: graph, title: 'Project' });
  const tiles = thumbnail.props.children.props.children;
  expect(tiles).toHaveLength(2);
  expect(tiles.map(tile => textOf(tile).trim())).toEqual(['First Shared', 'Second Shared']);
  expect(thumbnail.props.children.type).toBe('div');
});

test('graph thumbnail renders a response with the previous single-trail format', () => {
  const graph = {
    trailId: 'first', trailTitle: 'First', itemIds: ['note'],
    items: [{ id: 'note', title: 'Note', associations: [] }],
  };
  const thumbnail = exports.ProjectThumbnail({ thumbnailImageUrl: null, thumbnailGraph: graph, title: 'Project' });
  const tiles = thumbnail.props.children.props.children;
  expect(tiles).toHaveLength(1);
  expect(textOf(tiles[0])).toContain('First');
  expect(textOf(tiles[0])).toContain('Note');
});

test('static thumbnail keeps every trail when the graph has several', () => {
  const graph = {
    trails: ['One', 'Two', 'Three', 'Four', 'Five'].map((title, index) => ({ id: String(index), title, itemIds: [] })),
    items: [],
  };
  const thumbnail = exports.ProjectThumbnail({ thumbnailImageUrl: null, thumbnailGraph: graph, title: 'Project' });
  const grid = thumbnail.props.children;
  expect(grid.props.style.gridTemplateColumns).toContain('2');
  expect(grid.props.style.gridTemplateRows).toContain('3');
  expect(grid.props.children.map(tile => textOf(tile).trim())).toEqual(['One', 'Two', 'Three', 'Four', 'Five']);
});
