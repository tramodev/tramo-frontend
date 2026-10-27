import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('history names include dates and authors and pagination focuses the first appended version', async () => {
  const exports = {}, hooks = [];
  let cursor = 0, page = 0;
  const versions = [1, 2].map(id => ({ id, type: 'AUTO', name: null, authorUsername: 'author', createdAt: `2026-10-${10 + id}T12:00:00Z` }));
  const jsx = (type, props) => ({ type, props });
  const hook = init => { const index = cursor++; if (!(index in hooks)) hooks[index] = init(); return index; };
  runInNewContext(ts.transpileModule(readFileSync('components/editor/project-history-sheet.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => ({
    react: {
      useState: value => { const index = hook(() => value); return [hooks[index], next => { hooks[index] = typeof next === 'function' ? next(hooks[index]) : next; }]; },
      useRef: value => hooks[hook(() => ({ current: value }))],
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': {},
    'next/link': { default: 'Link', __esModule: true },
    'radix-ui': { Tabs: {} },
    '@/components/profile/row': {},
    '@/lib/project-snapshots': {},
    '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/input': {},
    '@/components/ui/sheet': { Sheet: 'Sheet' },
    '@/lib/project-history': { getProjectHistory: async () => ({ versions: [versions[page++]], nextCursor: page === 1 ? 1 : null }) },
  })[name] });
  const render = () => { cursor = 0; return exports.ProjectHistorySheet({ projectId: 'project', restoreEpoch: 0, beforeSave: async () => {} }); };
  const flatten = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)];
  const elements = () => flatten(render());
  elements().find(node => node.type === 'Sheet').props.onOpenChange(true);
  await new Promise(setImmediate);
  let rows = elements();
  const first = rows.find(node => node.type === 'Link');
  expect(first.props['aria-label']).toContain(new Date(versions[0].createdAt).toLocaleString());
  expect(first.props['aria-label']).toContain('author');
  rows.find(node => node.props?.children === 'Load older versions').props.onClick();
  rows = elements();
  const loadingButton = rows.find(node => node.props?.children === 'Load older versions');
  expect(loadingButton.props.disabled).not.toBe(true);
  expect(loadingButton.props['aria-disabled']).toBe(true);
  await new Promise(setImmediate);
  rows = elements();
  const links = rows.filter(node => node.type === 'Link');
  const focused = [];
  links.forEach((link, index) => link.props.ref?.({ focus: () => focused.push(index) }));
  expect(links).toHaveLength(2);
  expect(focused).toEqual([1]);
});
