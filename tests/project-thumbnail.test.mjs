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
  '@/components/editor/knowledge-graph': { KnowledgeGraph: 'KnowledgeGraph' },
  '@/components/shared/author-avatar': { initial: title => title[0] },
})[name] ?? {} });

const renderGraph = graph => {
  const element = exports.ProjectThumbnail({ thumbnailImageUrl: null, thumbnailGraph: graph, title: 'Project' });
  return element.type(element.props).props.children;
};

test('graph thumbnails reuse the full map with every trail and note', () => {
  const graph = {
    trails: [{ id: 'first', title: 'First', itemIds: ['shared'] }, { id: 'second', title: 'Second', itemIds: ['shared', 'other'] }],
    items: [{ id: 'shared', title: 'Shared', associations: [{ id: 'link', targetId: 'other', text: null }] }, { id: 'other', title: 'Other', associations: [] }],
  };
  const map = renderGraph(graph);
  expect(map.type).toBe('KnowledgeGraph');
  expect(map.props.variant).toBe('preview');
  expect(map.props.trails.map(trail => trail.itemIds)).toEqual([['shared'], ['shared', 'other']]);
  expect(map.props.items.shared.title).toBe('Shared');
  expect(map.props.items.shared.content).toBeNull();
  expect(map.props.items.shared.associations[0].targetId).toBe('other');
});

test('graph thumbnails accept the previous single-trail response', () => {
  const map = renderGraph({ trailId: 'first', trailTitle: 'First', itemIds: ['note'], items: [{ id: 'note', title: 'Note', associations: [] }] });
  expect(map.props.trails.map(trail => [trail.id, trail.title, trail.itemIds])).toEqual([['first', 'First', ['note']]]);
  expect(Object.keys(map.props.items)).toEqual(['note']);
});

test('uploaded images and empty graphs keep their thumbnail behavior', () => {
  const image = exports.ProjectThumbnail({ thumbnailImageUrl: '/image.png', thumbnailGraph: null, title: 'Project' });
  expect(image.props.children.type).toBe('Image');
  const placeholder = exports.ProjectThumbnail({ thumbnailImageUrl: null, thumbnailGraph: { trails: [], items: [] }, title: 'Project' });
  expect(placeholder.props.children.type).toBe('span');
});
