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

test('graph thumbnail includes every trail and one copy of a shared note', () => {
  const graph = {
    trails: [{ id: 'first', title: 'First', itemIds: ['shared'] }, { id: 'second', title: 'Second', itemIds: ['shared', 'other'] }],
    items: [{ id: 'shared', title: 'Shared', associations: [] }, { id: 'other', title: 'Other', associations: [] }],
  };
  const thumbnail = exports.ProjectThumbnail({ thumbnailImageUrl: null, thumbnailGraph: graph, title: 'Project' });
  const preview = thumbnail.props.children;
  expect(preview.props.trails.map(trail => trail.id)).toEqual(['first', 'second']);
  expect(Object.keys(preview.props.items)).toEqual(['shared', 'other']);
});

test('graph thumbnail renders a response with the previous single-trail format', () => {
  const graph = {
    trailId: 'first', trailTitle: 'First', itemIds: ['note'],
    items: [{ id: 'note', title: 'Note', associations: [] }],
  };
  const thumbnail = exports.ProjectThumbnail({ thumbnailImageUrl: null, thumbnailGraph: graph, title: 'Project' });
  const preview = thumbnail.props.children;
  expect(preview.props.trails.map(trail => trail.id)).toEqual(['first']);
  expect(Object.keys(preview.props.items)).toEqual(['note']);
});
