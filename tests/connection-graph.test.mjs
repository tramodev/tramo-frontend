import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const exports = {};
const itemLink = {};
const graphColors = {};
let states = [];
let index = 0;
const transpile = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
runInNewContext(transpile('app/editor/plugins/itemLink.ts'), { exports: itemLink });
runInNewContext(transpile('app/editor/graph-colors.ts'), { exports: graphColors });
runInNewContext(transpile('components/editor/knowledge-graph.tsx'), {
  exports,
  require: name => ({
    react: {
      memo: fn => fn,
      useMemo: fn => fn(),
      useRef: () => ({ current: null }),
      useState: value => {
        const position = index++;
        if (!(position in states)) states[position] = typeof value === 'function' ? value() : value;
        return [states[position], next => { states[position] = typeof next === 'function' ? next(states[position]) : next; }];
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next-themes': { useTheme: () => ({ resolvedTheme: 'light' }) },
    '@/hooks/use-mounted': { useMounted: () => true },
    '@/app/editor/editor-utils': { collectPlainText: content => [JSON.parse(content).root.text] },
    '@/app/editor/graph-colors': graphColors,
    '@/app/editor/plugins/itemLink': itemLink,
    '@xyflow/react': {
      ReactFlow: 'Flow', BaseEdge: 'BaseEdge', useInternalNode: () => null,
      getBezierPath: ({ sourceX, sourceY, targetX, targetY }) => [`M ${sourceX} ${sourceY} C ${targetX} ${targetY}`, 0, 0],
      Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
    },
  })[name] ?? {},
});
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
const render = props => {
  index = 0;
  return flatten(exports.KnowledgeGraph(props));
};
const flow = props => render(props).find(node => node.type === 'Flow');
const content = (...targets) => JSON.stringify({ root: { children: targets.map(target => ({ type: 'link', rel: `tramo-idea:${target}`, children: [{ type: 'text', text: target }] })) } });

test('shared notes have distinct cards and @ links draw one edge per pair', () => {
  states = [];
  const items = { a: { id: 'a', title: 'A', content: content('b', 'b') }, b: { id: 'b', title: 'B', content: content('a') } };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a', 'b'] }, { id: 'second', title: 'Second', itemIds: ['a'] }], onSelectItem() {} };
  const graph = flow(props);
  expect(graph.props.nodes.filter(node => node.type === 'card').map(node => node.id)).toEqual(['card:first:a', 'card:first:b', 'card:second:a']);
  expect(graph.props.edges.map(edge => edge.id)).toEqual(['shared:card:first:a:card:second:a', 'connection:a:b']);
  expect(graph.props.edges[1].source).toBe('card:first:a');
  expect(graph.props.edges[1].target).toBe('card:first:b');
  items.a.content = '';
  items.b.content = '';
  expect(flow(props).props.edges.map(edge => edge.id)).toEqual(['shared:card:first:a:card:second:a']);
});

test('map previews show @ links before notes are opened', () => {
  states = [];
  const items = { a: { id: 'a', title: 'A', content: null }, b: { id: 'b', title: 'B', content: null } };
  const props = {
    items,
    trails: [{ id: 'first', title: 'First', itemIds: ['a'] }, { id: 'second', title: 'Second', itemIds: ['b'] }],
    mapPreviews: { a: { text: 'First note', linkedItemIds: ['b'] }, b: { text: 'Second note', linkedItemIds: [] } },
    onSelectItem() {},
  };
  expect(flow(props).props.edges.map(edge => edge.id)).toEqual(['connection:a:b']);
  expect(flow(props).props.nodes.filter(node => node.type === 'card').map(node => node.data.preview)).toEqual(['First note', 'Second note']);
  items.a.content = content();
  expect(flow(props).props.edges).toEqual([]);
});

test('card selection opens the note on the second click', () => {
  states = [];
  const selected = [];
  const items = { a: { id: 'a', title: 'A', content: '' } };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a'] }], onSelectItem: (...args) => selected.push(args) };
  const graph = flow(props);
  const card = graph.props.nodes.find(node => node.type === 'card');
  graph.props.onNodeClick({ stopPropagation() {} }, card);
  expect(selected).toEqual([]);
  flow(props).props.onNodeClick({ stopPropagation() {} }, card);
  expect(selected.map(([item]) => item.id)).toEqual(['a']);
});

test('measured card height moves the next note', () => {
  states = [];
  const items = { a: { id: 'a', title: 'A', content: '' }, b: { id: 'b', title: 'B', content: '' } };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a', 'b'] }], onSelectItem() {} };
  flow(props).props.onNodesChange([{ id: 'card:first:a', type: 'dimensions', dimensions: { width: 480, height: 280 } }]);
  expect(flow(props).props.nodes.find(node => node.id === 'card:first:b').position.y).toBe(404);
});

test('stored graph colors are validated before use', () => {
  states = [];
  const items = { a: { id: 'a', title: 'A', content: '' } };
  const graph = flow({ items, trails: [{ id: 'first', title: 'First', itemIds: ['a'] }], graphColors: JSON.stringify({ items: { a: 'url(bad)' }, trails: { first: 'purple' } }), onSelectItem() {} });
  expect(graph.props.nodes.find(node => node.type === 'card').data.color).toBeUndefined();
  expect(graph.props.nodes.find(node => node.type === 'lane').data.color).toBe('purple');
});

test('note previews stop at 256 characters', () => {
  states = [];
  const noteContent = text => JSON.stringify({ root: { children: [{ text }] } });
  const items = { a: { id: 'a', title: 'A', content: noteContent('a'.repeat(256)) } };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a'] }], onSelectItem() {} };
  expect(flow(props).props.nodes.find(node => node.type === 'card').data.preview).toBe('a'.repeat(256));
  items.a.content = noteContent(`${'a'.repeat(256)}b`);
  expect(flow(props).props.nodes.find(node => node.type === 'card').data.preview).toBe(`${'a'.repeat(256)}...`);
});
