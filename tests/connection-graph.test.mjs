import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const exports = {};
let hookValues = [];
let hookIndex = 0;
let frames = [];
let sourceClicks = 0;
let edgePaths = [];
runInNewContext(ts.transpileModule(readFileSync('components/editor/knowledge-graph.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, requestAnimationFrame: callback => frames.push(callback), require: name => ({
  react: { memo: fn => fn, useMemo: fn => fn(), useRef: () => ({ current: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }), querySelectorAll: selector => selector === '.react-flow__edge-path' ? edgePaths : [{ dataset: { nodeid: 'card:second:a' }, click: () => { sourceClicks++; } }, { dataset: { nodeid: 'card:first:a' }, click: () => { sourceClicks++; } }], focus() {} } }), useState: value => {
    const index = hookIndex++;
    if (!(index in hookValues)) hookValues[index] = value;
    return [hookValues[index], next => { hookValues[index] = typeof next === 'function' ? next(hookValues[index]) : next; }];
  } },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next-themes': { useTheme: () => ({ resolvedTheme: 'light' }) },
  '@/hooks/use-mounted': { useMounted: () => true },
  '@/app/editor/editor-utils': { collectPlainText: content => [JSON.parse(content).root.text] },
  '@xyflow/react': { ReactFlow: 'Flow', MarkerType: { Arrow: 'arrow' }, Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' } },
})[name] ?? {} });
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
const renderTree = props => {
  hookIndex = 0;
  return flatten(exports.KnowledgeGraph(props));
};
const renderGraph = props => renderTree(props).find(node => node.type === 'Flow');
const edgePath = id => ({ closest: () => ({ getAttribute: () => id }), getScreenCTM: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), getPointAtLength: length => ({ x: length ? 300 : 100, y: 200 }), getTotalLength: () => 200 });

test('shared notes have distinct appearances and explicit connections appear once', () => {
  hookValues = [];
  const items = {
    a: { id: 'a', title: 'A', content: '', associations: [{ id: 'ab', targetId: 'b', text: 'Context' }] },
    b: { id: 'b', title: 'B', content: '', associations: [{ id: 'ba', targetId: 'a', text: null }] },
  };
  const trails = [{ id: 'first', title: 'First', itemIds: ['a', 'b'] }, { id: 'second', title: 'Second', itemIds: ['a'] }];
  const flow = renderGraph({ items, trails, onSelectItem() {} });
  expect(flow.props.nodes.filter(node => node.type === 'card').map(node => node.id)).toEqual(['card:first:a', 'card:first:b', 'card:second:a']);
  expect(flow.props.nodes.filter(node => node.type === 'lane').map(node => node.data.title)).toEqual(['First', 'Second']);
  expect(flow.props.edges.map(edge => edge.id)).toEqual(['a:ab', 'b:ba']);
  expect(flow.props.edges.every(edge => edge.type === 'straight')).toBe(true);
  expect(flow.props.edges.map(edge => [edge.source, edge.target])).toEqual([['card:first:a', 'card:first:b'], ['card:first:b', 'card:first:a']]);
  expect(flow.props.edges.every(edge => edge.markerEnd.type === 'arrow')).toBe(true);
});

test('a card opens only on its second click in the graph', () => {
  hookValues = [];
  const opened = [];
  const items = { a: { id: 'a', title: 'A', content: '', associations: [] }, b: { id: 'b', title: 'B', content: '', associations: [] } };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a', 'b'] }, { id: 'second', title: 'Second', itemIds: ['a'] }], selectedItemId: 'a', onSelectItem: (item, trailId) => opened.push([item.id, trailId]) };
  const click = id => {
    const flow = renderGraph(props);
    flow.props.onNodeClick({ stopPropagation() {} }, flow.props.nodes.find(node => node.id === id));
  };
  expect(renderGraph(props).props.nodes.find(node => node.id === 'card:first:a').data.selected).toBe(false);
  click('card:first:a');
  expect(opened).toEqual([]);
  expect(renderGraph(props).props.nodes.find(node => node.id === 'card:first:a').data.selected).toBe(true);
  click('card:second:a');
  expect(opened).toEqual([]);
  expect(renderGraph(props).props.nodes.find(node => node.id === 'card:second:a').data.selected).toBe(true);
  click('card:second:a');
  expect(opened).toEqual([['a', 'second']]);
});

test('dragging between cards uses original note IDs and ignores duplicate connections', async () => {
  hookValues = [];
  const calls = [];
  const items = {
    a: { id: 'a', title: 'A', content: '', associations: [{ id: 'ab', targetId: 'b', text: null }] },
    b: { id: 'b', title: 'B', content: '', associations: [] },
  };
  const trails = [{ id: 'first', title: 'First', itemIds: ['a'] }, { id: 'second', title: 'Second', itemIds: ['a', 'b'] }];
  const flow = renderGraph({ items, trails, onSelectItem() {}, onTie: async (...args) => calls.push(args) });
  await flow.props.onConnect({ source: 'card:first:a', target: 'card:second:b' });
  await flow.props.onConnect({ source: 'card:second:a', target: 'card:second:b' });
  await flow.props.onConnect({ source: 'card:first:a', target: 'card:second:a' });
  expect(calls).toEqual([]);
  await flow.props.onConnect({ source: 'card:second:b', target: 'card:first:a' });
  expect(calls).toEqual([['b', 'a', '']]);
});

test('measured card height moves the next card down without clipping', () => {
  hookValues = [];
  const items = {
    a: { id: 'a', title: 'A', content: '', associations: [] },
    b: { id: 'b', title: 'B', content: '', associations: [] },
  };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a', 'b'] }], onSelectItem() {} };
  renderGraph(props).props.onNodesChange([{ id: 'card:first:a', type: 'dimensions', dimensions: { width: 420, height: 280 } }]);
  const second = renderGraph(props).props.nodes.find(node => node.id === 'card:first:b');
  expect(second.position.y).toBe(404);
  const lane = renderGraph(props).props.nodes.find(node => node.id === 'lane:first');
  expect(lane.style.width).toBe(452);
  expect(lane.style.height).toBe(560);
});

test('cards show the first two nonempty paragraphs', () => {
  hookValues = [];
  const content = JSON.stringify({ root: { children: [{ text: '' }, { text: 'First paragraph' }, { text: 'Second paragraph' }, { text: 'Third paragraph' }] } });
  const items = { a: { id: 'a', title: 'A', content, associations: [] } };
  const flow = renderGraph({ items, trails: [{ id: 'first', title: 'First', itemIds: ['a'] }], onSelectItem() {} });
  expect(flow.props.nodes.find(node => node.type === 'card').data.preview).toBe('First paragraph\n\nSecond paragraph');
});

test('Connect starts from the selected appearance and exposes whole-card targets', () => {
  hookValues = [];
  frames = [];
  sourceClicks = 0;
  const calls = [];
  const selections = [];
  const items = {
    a: { id: 'a', title: 'A', content: '', associations: [] },
    b: { id: 'b', title: 'B', content: '', associations: [] },
  };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a'] }, { id: 'second', title: 'Second', itemIds: ['a', 'b'] }], onSelectItem: (...args) => selections.push(args), onTie: async (...args) => calls.push(args) };
  const flow = renderGraph(props);
  flow.props.onNodeContextMenu({ clientX: 100, clientY: 100, preventDefault() {}, currentTarget: { getBoundingClientRect: () => ({ left: 20, right: 440, top: 50, bottom: 190 }) } }, flow.props.nodes.find(node => node.id === 'card:second:a'));
  const option = renderTree(props).find(node => node.type === 'button' && node.props.children === 'Connect to another note');
  option.props.onClick();
  renderGraph(props);
  frames.shift()();
  expect(sourceClicks).toBe(1);
  const tree = renderTree(props);
  const line = tree.find(node => node.type === 'line');
  expect(line).toBeTruthy();
  expect([line.props.x1, line.props.y1]).toEqual([230, 120]);
  const connectingFlow = renderGraph(props);
  expect(connectingFlow.props.nodes.find(node => node.id === 'card:second:a').data.connectRole).toBe('source');
  expect(connectingFlow.props.nodes.find(node => node.id === 'card:first:a').data.connectRole).toBeUndefined();
  expect(connectingFlow.props.nodes.find(node => node.id === 'card:second:b').data.connectRole).toBe('target');
  const targetCard = flatten(connectingFlow.props.nodeTypes.card({ data: connectingFlow.props.nodes.find(node => node.id === 'card:second:b').data }));
  expect(targetCard.find(node => node.props.id === 'easy-target').props.className).toContain('!h-full !w-full');
  tree[0].props.onPointerMove({ clientX: 600, clientY: 300 });
  expect(renderTree(props).find(node => node.type === 'line').props.x1).toBe(line.props.x1);
  let stopped = false;
  connectingFlow.props.onNodeClick({ stopPropagation() { stopped = true; } }, connectingFlow.props.nodes.find(node => node.id === 'card:second:b'));
  expect(stopped).toBe(true);
  expect(calls).toEqual([]);
  connectingFlow.props.onConnect({ source: 'card:second:a', target: 'card:second:b' });
  expect(calls).toEqual([['a', 'b', '']]);
  expect(selections).toEqual([]);
  expect(renderTree(props).some(node => node.type === 'line')).toBe(false);
});

test('Escape cancels an unfinished connection arrow', () => {
  hookValues = [];
  frames = [];
  const items = { a: { id: 'a', title: 'A', content: '', associations: [] }, b: { id: 'b', title: 'B', content: '', associations: [] } };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a', 'b'] }], onSelectItem() {}, onTie: async () => {} };
  const flow = renderGraph(props);
  flow.props.onNodeContextMenu({ clientX: 100, clientY: 100, preventDefault() {}, currentTarget: { getBoundingClientRect: () => ({ left: 20, right: 440, top: 50, bottom: 190 }) } }, flow.props.nodes.find(node => node.id === 'card:first:a'));
  renderTree(props).find(node => node.type === 'button' && node.props.children === 'Connect to another note').props.onClick();
  frames.shift()();
  const tree = renderTree(props);
  expect(tree.some(node => node.type === 'line')).toBe(true);
  tree[0].props.onKeyDown({ key: 'Escape' });
  expect(renderTree(props).some(node => node.type === 'line')).toBe(false);
});

test('a failed save keeps the new connection visible as a temporary graph edge', async () => {
  hookValues = [];
  const items = { a: { id: 'a', title: 'A', content: '', associations: [] }, b: { id: 'b', title: 'B', content: '', associations: [] } };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a', 'b'] }], onSelectItem() {}, onTie: async () => { throw new Error('fetch failed'); } };
  renderGraph(props).props.onConnect({ source: 'card:first:a', target: 'card:first:b' });
  await new Promise(resolve => setImmediate(resolve));
  const tree = renderTree(props);
  expect(renderGraph(props).props.edges.map(edge => edge.id)).toEqual(['local:card:first:a:card:first:b']);
  expect(tree.find(node => node.props.role === 'alert').props.children).toContain('only in this graph');
  expect(items.a.associations).toEqual([]);
});

test('right-clicking a saved arrow removes its association through the existing handler', async () => {
  hookValues = [];
  edgePaths = [edgePath('a:ab')];
  const calls = [];
  const items = {
    a: { id: 'a', title: 'A', content: '', associations: [{ id: 'ab', targetId: 'b', text: null }] },
    b: { id: 'b', title: 'B', content: '', associations: [] },
  };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a', 'b'] }], onSelectItem() {}, onUntie: async (...args) => { calls.push(args); items.a.associations = []; } };
  renderGraph(props);
  let prevented = false;
  renderTree(props)[0].props.onContextMenuCapture({ clientX: 200, clientY: 200, target: { closest: () => null }, preventDefault() { prevented = true; }, stopPropagation() {} });
  const option = renderTree(props).find(node => node.type === 'button' && node.props.children === 'Remove connection');
  expect(prevented).toBe(true);
  option.props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  expect(calls).toEqual([['a', 'ab']]);
  expect(renderGraph(props).props.edges).toEqual([]);
});

test('right-clicking a temporary arrow removes it locally', async () => {
  hookValues = [];
  edgePaths = [edgePath('local:card:first:a:card:first:b')];
  const calls = [];
  const items = { a: { id: 'a', title: 'A', content: '', associations: [] }, b: { id: 'b', title: 'B', content: '', associations: [] } };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a', 'b'] }], onSelectItem() {}, onTie: async () => { throw new Error('offline'); }, onUntie: async (...args) => calls.push(args) };
  renderGraph(props).props.onConnect({ source: 'card:first:a', target: 'card:first:b' });
  await new Promise(resolve => setImmediate(resolve));
  renderTree(props)[0].props.onContextMenuCapture({ clientX: 200, clientY: 200, target: { closest: () => null }, preventDefault() {}, stopPropagation() {} });
  renderTree(props).find(node => node.type === 'button' && node.props.children === 'Remove connection').props.onClick();
  expect(renderGraph(props).props.edges).toEqual([]);
  expect(calls).toEqual([]);
});
