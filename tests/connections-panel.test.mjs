import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const settle = () => new Promise(resolve => setImmediate(resolve));
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
function setup() {
  const states = [], refs = [];
  let state = 0, ref = 0;
  const exports = {};
  const itemLink = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/itemLink.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: itemLink });
  const source = ts.transpileModule(readFileSync('components/editor/connections-panel.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(source, { exports, require: name => ({
    react: {
      useMemo: calculate => calculate(),
      useState: value => {
        const i = state++;
        if (!(i in states)) states[i] = value;
        return [states[i], next => { states[i] = next; }];
      },
      useRef: value => refs[ref++] ?? (refs[ref - 1] = { current: value }),
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/app/editor/associations': { CONNECTION_TEXT_LIMIT: 4002 },
    '@/app/editor/plugins/itemLink': itemLink,
    '@/components/editor/knowledge-graph': { KnowledgeGraph: 'KnowledgeGraph' },
  })[name] ?? {} });
  const items = Object.fromEntries(['a', 'b', 'c'].map(id => [id, { id, title: id.toUpperCase(), associations: [] }]));
  let props = { items, item: items.a, trails: [], open: true };
  const render = changes => { props = { ...props, ...changes }; state = ref = 0; return flatten(exports.ConnectionsPanel(props)); };
  const find = (nodes, type, text) => nodes.find(node => node.type === type && (text === undefined || node.props.children === text));
  return { render, items, find };
}

test('connections can be edited and removed from either note', async () => {
  const { render, items, find } = setup();
  items.a.associations = [{ id: 'ab', targetId: 'b', text: 'Shared', targetTitle: 'B' }];
  items.b.associations = [{ id: 'ab', targetId: 'a', text: 'Shared', targetTitle: 'A' }];
  const edits = [], removals = [];
  let nodes = render({ item: items.b, onUpdateAssociation: async (...args) => edits.push(args), onUntie: async (...args) => removals.push(args) });
  find(nodes, 'button', 'Edit explanation').props.onClick();
  nodes = render();
  expect(find(nodes, 'select')).toBeUndefined();
  expect(find(nodes, 'textarea').props.maxLength).toBe(4002);
  find(nodes, 'textarea').props.onChange({ target: { value: '' } });
  find(render(), 'form').props.onSubmit({ preventDefault() {} });
  await settle();
  expect(edits).toEqual([['b', 'ab', '']]);
  find(render(), 'button', 'Remove').props.onClick();
  await settle();
  expect(removals).toEqual([['b', 'ab']]);
});

test('@ mentions appear from both notes and do not duplicate saved connections', () => {
  const { render, items, find } = setup();
  items.a.content = JSON.stringify({ root: { children: [{ type: 'link', rel: 'tramo-idea:b' }] } });
  const selected = [];
  let nodes = render({ onSelectItem: note => selected.push(note.id), mapPreviews: { c: { text: '', linkedItemIds: ['a'] } } });
  expect([find(nodes, 'h2').props.children].flat().join('')).toBe('Connections (2)');
  expect(find(nodes, 'button', 'A — B')).toBeDefined();
  expect(find(nodes, 'button', 'C — A')).toBeDefined();
  expect(find(nodes, 'button', 'Remove')).toBeUndefined();
  expect(find(nodes, 'p', 'No connections.')).toBeUndefined();
  find(nodes, 'button', 'C — A').props.onClick();
  expect(selected).toEqual(['c']);

  nodes = render({ item: items.b });
  expect(find(nodes, 'button', 'A — B')).toBeDefined();
  find(nodes, 'button', 'A — B').props.onClick();
  expect(selected).toEqual(['c', 'a']);

  items.a.associations = [{ id: 'ab', targetId: 'b', text: null, targetTitle: 'B' }];
  nodes = render({ item: items.a });
  expect(nodes.filter(node => node.type === 'button' && [node.props.children].flat().join('') === 'A — B')).toHaveLength(1);
  expect(find(nodes, 'button', 'Remove')).toBeDefined();
});

test('map waits for previews and offers retry after a failed load', () => {
  const { render, items, find } = setup();
  items.a.associations = [{ id: 'ab', targetId: 'b', text: null, targetTitle: 'B' }];
  let retried = false;
  let nodes = render({ mapPreviews: undefined, onRetryMapPreviews: () => { retried = true; } });
  expect(nodes.some(node => node.props.role === 'status' && node.props.children === 'Loading map…')).toBe(true);
  expect(nodes.some(node => node.type === 'KnowledgeGraph')).toBe(false);
  nodes = render({ mapPreviews: null });
  expect(nodes.some(node => node.props.role === 'alert')).toBe(true);
  nodes.find(node => node.type === 'button' && node.props.children === 'Retry').props.onClick();
  expect(retried).toBe(true);
  nodes = render({ mapPreviews: { a: { text: 'Preview', linkedItemIds: [] } } });
  expect(nodes.find(node => node.type === 'KnowledgeGraph').props.mapPreviews.a.text).toBe('Preview');
  expect(find(nodes, 'button', 'Connect notes')).toBeUndefined();
  expect(nodes.findIndex(node => node.type === 'section')).toBeLessThan(nodes.findIndex(node => node.type === 'KnowledgeGraph'));
  expect(find(nodes, 'section').props.className).toContain('overflow-y-auto');
  expect(nodes.some(node => node.type === 'div' && node.props.className?.includes('h-40 shrink-0'))).toBe(true);
  expect(find(nodes, 'KnowledgeGraph').props.variant).toBe('preview');
  items.a.associations = [];
  nodes = render();
  expect([find(nodes, 'h2').props.children].flat().join('')).toBe('Connections (0)');
  expect(find(nodes, 'p', 'Use @ to connect notes.')).toBeDefined();
  expect(find(nodes, 'KnowledgeGraph')).toBeDefined();
});
