import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
const jsx = (type, props) => ({ type, props });
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
runInNewContext(ts.transpileModule(readFileSync('components/feed/explore-card.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: name => ({
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/link': { default: 'Link' },
  '@/components/project/project-thumbnail': { ProjectThumbnail: 'Thumbnail' },
})[name] ?? {} });

test.each([true, false])('thumbnail does not intercept card clicks; interactive=%s', interactive => {
  const project = { id: 'project', title: 'Project', ownerUsername: 'owner', tags: [], viewCount: 0, commentCount: 0, thumbnailImageUrl: '/image.png' };
  const nodes = flatten(exports.ExploreCard({ project, loggedIn: false, username: null, interactive }));
  expect(nodes.find(node => node.type === 'Thumbnail').props.className).toContain('pointer-events-none');
  expect(nodes.some(node => node.type === 'Link' && node.props.href === '/p/project')).toBe(interactive);
});

test('featured thumbnail also lets clicks reach its card link', () => {
  const source = readFileSync('app/(app)/explore/page.tsx', 'utf8');
  expect(source).toContain('className="pointer-events-none rounded-[20px] h-[250px] bg-accent"');
});
