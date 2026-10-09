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
let internalNodes = {};
const colorExports = {};
const itemLinkExports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/graph-colors.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: colorExports });
runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/itemLink.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: itemLinkExports });
runInNewContext(ts.transpileModule(readFileSync('components/editor/knowledge-graph.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, requestAnimationFrame: callback => frames.push(callback), require: name => ({
  react: { memo: fn => fn, useMemo: fn => fn(), useCallback: fn => fn, useRef: () => ({ current: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }), querySelectorAll: selector => selector === '.react-flow__edge-path' ? edgePaths : [{ dataset: { nodeid: 'card:second:a' }, click: () => { sourceClicks++; } }, { dataset: { nodeid: 'card:first:a' }, click: () => { sourceClicks++; } }], focus() {} } }), useState: value => {
    const index = hookIndex++;
    if (!(index in hookValues)) hookValues[index] = typeof value === 'function' ? value() : value;
    return [hookValues[index], next => { hookValues[index] = typeof next === 'function' ? next(hookValues[index]) : next; }];
  } },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next-themes': { useTheme: () => ({ resolvedTheme: 'light' }) },
  '@/hooks/use-mounted': { useMounted: () => true },
  '@/app/editor/editor-utils': { collectPlainText: content => [JSON.parse(content).root.text] },
  '@/app/editor/graph-colors': colorExports,
  '@/app/editor/plugins/itemLink': itemLinkExports,
  '@/components/editor/connection-comment': { ConnectionComment: 'ConnectionComment' },
  'lucide-react': { MessageSquareText: 'MessageSquareText' },
  '@xyflow/react': { ReactFlow: 'Flow', BaseEdge: 'BaseEdge', EdgeLabelRenderer: 'EdgeLabelRenderer', useInternalNode: id => internalNodes[id], getBezierPath: ({ sourceX, sourceY, targetX, targetY }) => [`M ${sourceX} ${sourceY} C ${targetX} ${targetY}`, (sourceX + targetX) / 2, (sourceY + targetY) / 2], Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' } },
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
    b: { id: 'b', title: 'B', content: '', associations: [{ id: 'ba', targetId: 'a', text: 'Other context' }] },
  };
  const trails = [{ id: 'first', title: 'First', itemIds: ['a', 'b'] }, { id: 'second', title: 'Second', itemIds: ['a'] }];
  const props = { items, trails, onSelectItem() {} };
  const flow = renderGraph(props);
  expect(flow.props.nodes.filter(node => node.type === 'card').map(node => node.id)).toEqual(['card:first:a', 'card:first:b', 'card:second:a']);
  expect(flow.props.nodes.filter(node => node.type === 'lane').map(node => node.data.title)).toEqual(['First', 'Second']);
  expect(flow.props.edges.map(edge => edge.id)).toEqual(['shared:card:first:a:card:second:a', 'connection:a:b']);
  expect(flow.props.edges.map(edge => edge.type)).toEqual(['floating', 'floating']);
  expect(flow.props.edges[1].data.hasComment).toBe(true);
  internalNodes = {
    'card:first:a': { id: 'card:first:a', measured: { width: 100, height: 100 }, internals: { positionAbsolute: { x: 0, y: 0 } } },
    'card:first:b': { id: 'card:first:b', measured: { width: 100, height: 100 }, internals: { positionAbsolute: { x: 0, y: 180 } } },
    'card:second:a': { id: 'card:second:a', measured: { width: 100, height: 100 }, internals: { positionAbsolute: { x: 400, y: 0 } } },
  };
  const renderedEdge = flatten(flow.props.edgeTypes.floating({ source: flow.props.edges[1].source, target: flow.props.edges[1].target, data: flow.props.edges[1].data }));
  expect(renderedEdge.find(node => node.type === 'BaseEdge').props.path).toContain(' C ');
  const marker = renderedEdge.find(node => node.props['aria-label'] === 'View connection comment');
  expect(marker).toBeDefined();
  marker.props.onClick({ stopPropagation() {} });
  expect(JSON.stringify(renderTree(props).find(node => node.props.role === 'status'))).toContain('Context');
  expect(flow.props.edges.map(edge => [edge.source, edge.target])).toEqual([['card:first:a', 'card:second:a'], ['card:first:a', 'card:first:b']]);
  expect(flow.props.edges.every(edge => edge.markerEnd === undefined)).toBe(true);
  expect(flow.props.edges[0].style.strokeDasharray).toBe('2 6');
  expect(flatten(flow.props.edgeTypes.floating({ source: flow.props.edges[0].source, target: flow.props.edges[0].target, style: flow.props.edges[0].style })).find(node => node.type === 'BaseEdge').props.style.strokeDasharray).toBe('2 6');
  expect(flow.props.edges[0].style.stroke).toBe('var(--ed-purple)');
  expect(flow.props.edges[0].selectable).toBe(false);
  flow.props.onEdgeClick({}, flow.props.edges[1]);
  expect(JSON.stringify(renderTree(props).find(node => node.props.role === 'status'))).toContain('Context\\n\\nOther context');
});

test('connections bend around notes between their endpoints', () => {
  hookValues = [];
  const items = Object.fromEntries(['a', 'b', 'c'].map(id => [id, { id, title: id, content: '', associations: id === 'a' ? [{ id: 'ac', targetId: 'c', text: null }] : [] }]));
  const trails = ['a', 'b', 'c'].map(id => ({ id, title: id, itemIds: [id] }));
  const flow = renderGraph({ items, trails, onSelectItem() {} });
  internalNodes = Object.fromEntries(flow.props.nodes.filter(node => node.type === 'card').map(node => [node.id, { id: node.id, measured: { width: 420, height: 132 }, internals: { positionAbsolute: node.position } }]));
  const edge = flow.props.edges.find(edge => edge.id === 'connection:a:c');
  const path = flatten(flow.props.edgeTypes.floating(edge)).find(node => node.type === 'BaseEdge').props.path;
  expect(path).toContain(' Q ');
  expect(path).toContain(' 68');

  const oneTrail = renderGraph({ items, trails: [{ id: 'all', title: 'All', itemIds: ['a', 'b', 'c'] }], onSelectItem() {} });
  internalNodes = Object.fromEntries(oneTrail.props.nodes.filter(node => node.type === 'card').map(node => [node.id, { id: node.id, measured: { width: 420, height: 132 }, internals: { positionAbsolute: node.position } }]));
  const verticalEdge = oneTrail.props.edges.find(edge => edge.id === 'connection:a:c');
  const verticalPath = flatten(oneTrail.props.edgeTypes.floating(verticalEdge)).find(node => node.type === 'BaseEdge').props.path;
  expect(verticalPath).toContain(' Q ');
  expect(verticalPath).toContain('460');
});

test('repeated and reciprocal note links draw one wire per pair', () => {
  hookValues = [];
  const content = (...targets) => JSON.stringify({ root: { children: targets.map(target => ({ type: 'paragraph', children: [{ type: 'link', rel: `tramo-idea:${target}`, children: [{ type: 'text', text: target }] }] })) } });
  const items = {
    a: { id: 'a', title: 'A', content: content('b', 'b', 'b'), associations: [] },
    b: { id: 'b', title: 'B', content: content('a'), associations: [] },
  };
  const trails = [{ id: 'first', title: 'First', itemIds: ['a', 'b'] }];
  const calls = [];
  const props = { items, trails, onSelectItem() {}, onTie: async (...args) => calls.push(args) };
  let flow = renderGraph(props);
  expect(flow.props.edges.map(edge => edge.id)).toEqual(['connection:a:b']);
  expect(flow.props.edges[0].data.hasComment).toBe(false);
  flow.props.onConnect({ source: 'card:first:a', target: 'card:first:b' });
  expect(calls).toEqual([]);
  flow.props.onEdgeClick({}, flow.props.edges[0]);
  expect(JSON.stringify(renderTree(props).find(node => node.props.role === 'status'))).toContain('Linked in note.');
  items.a.associations = [{ id: 'ab', targetId: 'b', text: 'Context' }];
  flow = renderGraph(props);
  expect(flow.props.edges.map(edge => edge.id)).toEqual(['connection:a:b']);
  flow.props.onEdgeClick({}, flow.props.edges[0]);
  expect(JSON.stringify(renderTree(props).find(node => node.props.role === 'status'))).toContain('Context');
  items.a.associations = [];
  items.a.content = '';
  items.b.content = '';
  expect(renderGraph(props).props.edges).toEqual([]);
});

test('three appearances of one note are connected without duplicating links', () => {
  hookValues = [];
  const items = { a: { id: 'a', title: 'A', content: '', associations: [] } };
  const trails = ['first', 'second', 'third'].map(id => ({ id, title: id, itemIds: ['a'] }));
  const props = { items, trails, onSelectItem() {} };
  const flow = renderGraph(props);
  expect(flow.props.edges.map(edge => [edge.source, edge.target])).toEqual([
    ['card:first:a', 'card:second:a'],
    ['card:second:a', 'card:third:a'],
  ]);
  flow.props.onNodeClick({ stopPropagation() {} }, flow.props.nodes.find(node => node.id === 'card:first:a'));
  flow.props.onEdgeClick({}, flow.props.edges[0]);
  expect(renderGraph(props).props.nodes.find(node => node.id === 'card:first:a').data.selected).toBe(true);
});

test('graph background colors save for shared notes and trails', async () => {
  hookValues = [];
  const items = { a: { id: 'a', title: 'A', content: '', associations: [] } };
  const trails = ['first', 'second'].map(id => ({ id, title: id, itemIds: ['a'] }));
  const props = { graphColors: null, items, trails, onSelectItem() {}, onTie: async () => {}, onSaveColors: async colors => { props.graphColors = colors; } };
  const event = { clientX: 100, clientY: 100, preventDefault() {}, currentTarget: { getBoundingClientRect: () => ({ left: 20, right: 440, top: 50, bottom: 190 }) } };
  let flow = renderGraph(props);
  flow.props.onNodeContextMenu(event, flow.props.nodes.find(node => node.id === 'card:first:a'));
  renderTree(props).find(node => node.props['aria-label'] === 'Note background: blue').props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  expect(renderGraph(props).props.nodes.filter(node => node.type === 'card').map(node => node.data.color)).toEqual(['blue', 'blue']);
  flow = renderGraph(props);
  expect(flow.props.nodes.find(node => node.id === 'lane:first').style.pointerEvents).toBeUndefined();
  flow.props.onNodeContextMenu(event, flow.props.nodes.find(node => node.id === 'lane:first'));
  renderTree(props).find(node => node.props['aria-label'] === 'Trail background: red').props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  expect(renderGraph(props).props.nodes.find(node => node.id === 'lane:first').data.color).toBe('red');
  hookValues = [];
  flow = renderGraph(props);
  expect(flow.props.nodes.find(node => node.id === 'card:second:a').data.color).toBe('blue');
  expect(flow.props.nodes.find(node => node.id === 'lane:first').data.color).toBe('red');
  expect(flow.props.nodes.find(node => node.id === 'lane:second').data.color).toBeUndefined();
  flow.props.onNodeContextMenu(event, flow.props.nodes.find(node => node.id === 'card:second:a'));
  renderTree(props).find(node => node.props['aria-label'] === 'Note background: Default').props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  expect(renderGraph(props).props.nodes.filter(node => node.type === 'card').every(node => node.data.color === undefined)).toBe(true);
});

test('invalid stored colors never become graph styles', () => {
  hookValues = [];
  const items = { a: { id: 'a', title: 'A', content: '', associations: [] } };
  const trails = [{ id: 'first', title: 'First', itemIds: ['a'] }];
  const flow = renderGraph({ graphColors: JSON.stringify({ items: { a: 'url(bad)' }, trails: { first: 'purple' } }), items, trails, onSelectItem() {} });
  expect(flow.props.nodes.find(node => node.type === 'card').data.color).toBeUndefined();
  expect(flow.props.nodes.find(node => node.type === 'lane').data.color).toBe('purple');
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
  expect(calls).toEqual([]);
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

test('cards show all nonempty paragraphs up to 256 characters', () => {
  hookValues = [];
  const content = JSON.stringify({ root: { children: [{ text: '' }, { text: 'First paragraph' }, { text: 'Second paragraph' }, { text: 'Third paragraph' }] } });
  const items = { a: { id: 'a', title: 'A', content, associations: [] } };
  const flow = renderGraph({ items, trails: [{ id: 'first', title: 'First', itemIds: ['a'] }], onSelectItem() {} });
  expect(flow.props.nodes.find(node => node.type === 'card').data.preview).toBe('First paragraph\n\nSecond paragraph\n\nThird paragraph');
});

test('cards add an ellipsis only when content exceeds 256 characters', () => {
  hookValues = [];
  const content = text => JSON.stringify({ root: { children: [{ text }] } });
  const items = { a: { id: 'a', title: 'A', content: content('a'.repeat(256)), associations: [] } };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a'] }], onSelectItem() {} };
  expect(renderGraph(props).props.nodes.find(node => node.type === 'card').data.preview).toBe('a'.repeat(256));
  items.a.content = content(`${'a'.repeat(256)}b`);
  expect(renderGraph(props).props.nodes.find(node => node.type === 'card').data.preview).toBe(`${'a'.repeat(256)}...`);
});

test('map previews use the same cards and layout as the full map', () => {
  hookValues = [];
  const items = {
    a: { id: 'a', title: 'Loaded', content: JSON.stringify({ root: { children: [{ text: 'Draft text' }] } }), associations: [] },
    b: { id: 'b', title: 'Unloaded', content: null, associations: [] },
  };
  const props = { items, trails: [{ id: 'first', title: 'First', itemIds: ['a'] }, { id: 'second', title: 'Second', itemIds: ['b'] }], onSelectItem() {} };
  const full = renderGraph(props);
  expect(full.props.nodes.find(node => node.id === 'card:first:a').data.preview).toBe('Draft text');
  const small = renderGraph({ ...props, variant: 'preview' });
  const cards = small.props.nodes.filter(node => node.type === 'card');
  expect(cards.map(node => node.data.preview)).toEqual(['Draft text', '']);
  expect(cards.map(node => node.position.x)).toEqual([16, 526]);
  expect(small.props.nodes.filter(node => node.type === 'lane').map(node => node.style.width)).toEqual([452, 452]);
  const card = flatten(small.props.nodeTypes.card({ data: cards[0].data }));
  expect(card[0].props.className).toContain('w-[420px]');
  expect(card.find(node => node.props.children === 'Loaded').props.className).toContain('text-lg');
  expect(JSON.stringify(card)).toContain('Draft text');
  expect(JSON.stringify(small.props.nodeTypes.card({ data: cards[1].data }))).not.toContain('No preview available');
  expect(small.props.fitView).toBe(true);
  expect(small.props.minZoom).toBe(0.01);
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
  expect(tree.find(node => node.props.role === 'alert').props.children).toContain('only in this map');
  expect(items.a.associations).toEqual([]);
});

test('right-clicking a saved arrow removes its association through the existing handler', async () => {
  hookValues = [];
  edgePaths = [edgePath('connection:a:b')];
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
