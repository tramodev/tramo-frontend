import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function graph() {
  const exports = {}, selected = [];
  const jsx = (type, props) => ({ type, props });
  const noop = () => {};
  runInNewContext(ts.transpileModule(readFileSync('components/editor/knowledge-graph.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => ({
    react: { memo: fn => fn, useMemo: fn => fn(), useRef: () => ({ current: null }), useState: value => [typeof value === 'function' ? value() : value, noop] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next-themes': { useTheme: () => ({ resolvedTheme: 'light' }) },
    '@/hooks/use-mounted': { useMounted: () => true },
    '@xyflow/react': { ReactFlow: 'ReactFlow', Position: {} },
    '@xyflow/react/dist/style.css': {},
    '@/app/editor/editor-utils': {},
    '@/app/editor/plugins/itemLink': { itemIdsFromContent: () => [] },
    '@/app/editor/graph-colors': { GRAPH_COLORS: [], parseGraphColors: () => ({ items: {}, trails: {} }) },
  })[name] });
  const root = exports.KnowledgeGraph({ trails: [{ id: 'trail', title: 'Trail', itemIds: ['note'] }], items: { note: { id: 'note', title: 'A note', content: null } }, onSelectItem: (...args) => selected.push(args) });
  const flow = root.props.children[0].props.children;
  return { root, flow, selected };
}

test('map cards have names, open directly with Enter or Space, and leave connections out of the tab order', () => {
  const { root, flow, selected } = graph();
  const card = flow.props.nodes.find(node => node.type === 'card');
  expect(card.ariaLabel).toBe('Open note: A note');
  expect(card.ariaRole).toBe('button');
  expect(flow.props.nodes.find(node => node.type === 'lane').focusable).toBe(false);
  expect(flow.props.edgesFocusable).toBe(false);
  for (const key of ['Enter', ' ']) {
    root.props.onKeyDown({ key, target: { closest: () => ({ getAttribute: () => card.id }) }, preventDefault() {}, stopPropagation() {} });
  }
  expect(selected).toHaveLength(2);
  expect(selected[0][0].id).toBe('note');
  expect(selected[0][1]).toBe('trail');
});

test('double tap does not zoom and card width fits narrow screens', () => {
  const { flow } = graph();
  expect(flow.props.zoomOnDoubleClick).toBe(false);
  const card = flow.props.nodeTypes.card({ data: flow.props.nodes[0].data });
  expect(card.props.className).toContain('w-[min(480px,calc(100vw-6rem))]');
});
