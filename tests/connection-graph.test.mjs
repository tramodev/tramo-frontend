import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('components/editor/knowledge-graph.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: name => ({
  react: { memo: fn => fn, useMemo: fn => fn(), useState: value => [value, () => {}] },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next-themes': { useTheme: () => ({ resolvedTheme: 'light' }) },
  '@/hooks/use-mounted': { useMounted: () => true },
  '@xyflow/react': { ReactFlow: 'Flow', MarkerType: { ArrowClosed: 'arrow' } },
})[name] ?? {} });
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

test('opposite connections use separate paths and IDs; trail order is independent', () => {
  const items = {
    a: { id: 'a', title: 'A', associations: [{ id: 'ab', targetId: 'b', text: 'Context' }] },
    b: { id: 'b', title: 'B', associations: [{ id: 'ba', targetId: 'a', text: null }] },
  };
  const nodes = flatten(exports.KnowledgeGraph({ items, trails: [{ id: 'trail', itemIds: ['b', 'a'] }], onSelectItem() {} }));
  const flow = nodes.find(n => n.type === 'Flow');
  const edges = flow.props.edges;
  const ab = edges.find(e => e.id === 'assoc-ab'), ba = edges.find(e => e.id === 'assoc-ba');
  expect([ab.source, ab.target]).toEqual(['a', 'b']);
  expect([ba.source, ba.target]).toEqual(['b', 'a']);
  expect(ab.sourceHandle).not.toBe(ba.sourceHandle);
  expect(ab.markerEnd).toEqual(ba.markerEnd);
  expect(edges.find(e => e.id.startsWith('spine-')).markerEnd).toBeUndefined();
  expect(edges.find(e => e.id.startsWith('spine-')).selectable).toBe(false);
  expect(nodes.filter(n => n.type === 'option').map(n => n.props.value)).toEqual(['', 'ba', 'ab']);
});
