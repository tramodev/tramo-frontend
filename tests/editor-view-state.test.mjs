import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

test('the map hides the write view without unmounting it and keeps an empty project usable', () => {
  const exports = {};
  const item = { id: '42', title: 'Note', content: '' };
  const project = { loaded: true, projectTitle: 'Project', view: 'write', items: { 42: item }, trails: [], selectedItem: item };
  runInNewContext(ts.transpileModule(readFileSync('app/editor/editor-workspace.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: name => ({
      react: { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useSyncExternalStore: () => false, useRef: value => ({ current: value }), useMemo: fn => fn(), useEffect() {} },
      'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
      'next/navigation': { useParams: () => ({ projectId: 'audit' }) },
      '@/app/editor/editor-utils': { countProjectTextStats: () => ({ words: 0, characters: 0 }) },
      '@/app/editor/[projectId]/hooks/useProjectEditorState': { useProjectEditorState: () => project },
      '@/components/editor/project-shell': { ProjectShell: 'ProjectShell' },
      '@/app/editor/[projectId]/components/WriteView': { WriteView: 'WriteView' },
      '@/components/editor/graph-view': { GraphView: 'GraphView' },
    })[name] ?? {},
  });
  const render = () => flatten(flatten(exports.ProjectEditor({ routeProjectId: 'project', user: { userId: '1', username: 'owner' } })).find(node => node.type === 'ProjectShell').props.content);
  const write = render().find(node => node.type === 'div' && node.props.children?.type === 'WriteView');
  expect(write).toBeDefined();
  expect(write.props.inert).toBe(false);
  expect(write.props.children.props.active).toBe(true);
  project.view = 'graph';
  const graph = render();
  const hidden = graph.find(node => node.type === 'div' && node.props.children?.type === 'WriteView');
  expect(hidden.type).toBe(write.type);
  expect(hidden.props.className).toBe('hidden');
  expect(hidden.props.inert).toBe(true);
  expect(hidden.props.children.props.active).toBe(false);
  expect(graph.some(node => node.type === 'GraphView')).toBe(true);
  project.view = 'write';
  expect(render().find(node => node.type === 'WriteView').props.active).toBe(true);
  project.selectedItem = undefined;
  expect(render().some(node => node.props.children === 'Start writing')).toBe(true);
});
