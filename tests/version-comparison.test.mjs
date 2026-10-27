import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync('lib/version-comparison.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });

test('comparison preserves additions, removals and rich content changes while skipping unchanged entries', () => {
  const before = [{ id: 1, content: 'old' }, { id: 2, content: 'removed' }, { id: 4, content: null }];
  const after = [{ id: 1, content: 'new' }, { id: 3, content: 'added' }, { id: 4, content: null }];
  const changes = exports.compareVersionEntries(before, after);
  expect(changes.map(({ id, status }) => ({ id, status }))).toEqual([{ id: 1, status: 'Changed' }, { id: 2, status: 'Removed' }, { id: 3, status: 'Added' }]);
  expect(changes[0]).toMatchObject({ before: before[0], after: after[0] });
  expect(changes[1].after).toBeUndefined();
  expect(changes[2].before).toBeUndefined();
});

test('trail comparison detects membership order and metadata changes', () => {
  expect(exports.compareVersionEntries([{ id: 1, itemIds: [1, 2] }], [{ id: 1, itemIds: [2, 1] }])[0].status).toBe('Changed');
  expect(exports.compareVersionEntries([{ id: 1, title: 'Old' }], [{ id: 1, title: 'New' }])).toHaveLength(1);
  expect(exports.compareVersionEntries([], [])).toEqual([]);
});

test.each([undefined, null, '', 'author'])('comparison handles author %s without an empty attribution', authorUsername => {
  const component = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('components/project/version-comparison.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports: component, require: name => ({
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': {},
    '@/components/project/lexical-read-only': {},
    '@/components/editor/editor-images-provider': {},
    '@/lib/version-comparison': exports,
  })[name] });
  const detail = id => ({ version: { id, name: 'Snapshot', createdAt: '2026-10-27T12:00:00Z', authorUsername }, snapshot: { title: 'Project', description: '', items: [], trails: [] } });
  const root = component.VersionComparison({ projectId: 'project', before: detail(1), after: detail(2) });
  const text = node => typeof node === 'string' ? node : !node || typeof node !== 'object' ? '' : [node.props?.children].flat(Infinity).map(text).join('');
  const visible = text(root);
  expect(visible.includes('@')).toBe(Boolean(authorUsername));
  if (authorUsername) expect(visible.match(/@author/g)).toHaveLength(2);
  expect(visible).not.toContain('undefined');
  expect(visible).not.toContain('null');
});
