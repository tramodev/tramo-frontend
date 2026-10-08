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
  const jsx = (type, props) => ({ type, props });
  const source = ts.transpileModule(readFileSync('components/editor/connections-panel.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(source, { exports, require: name => ({
    react: {
      useState: value => {
        const i = state++;
        if (!(i in states)) states[i] = value;
        return [states[i], next => { states[i] = next; }];
      },
      useRef: value => refs[ref++] ?? (refs[ref - 1] = { current: value }),
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/app/editor/associations': { CONNECTION_TEXT_LIMIT: 2000 },
  })[name] ?? {} });
  const items = Object.fromEntries(['a', 'b', 'c'].map(id => [id, { id, title: id.toUpperCase(), associations: [] }]));
  let props = { items, item: items.a, trails: [], open: true };
  const render = changes => { props = { ...props, ...changes }; state = ref = 0; return flatten(exports.ConnectionsPanel(props)); };
  const find = (nodes, type, text) => nodes.find(node => node.type === type && (text === undefined || node.props.children === text));
  return { render, items, find };
}

test('creation fixes source, keeps draft on error, rejects double submit and retries', async () => {
  const { render, items, find } = setup();
  let requests = [], reject;
  let nodes = render({ onTie: (...args) => { requests.push(args); return new Promise((resolve, fail) => { reject = fail; }); } });
  find(nodes, 'button', 'Connect notes').props.onClick();
  nodes = render();
  find(nodes, 'select').props.onChange({ target: { value: 'c' } });
  nodes = render();
  find(nodes, 'textarea').props.onChange({ target: { value: 'Context' } });
  nodes = render({ item: items.b });
  expect(find(nodes, 'textarea').props.maxLength).toBe(2000);
  const form = find(nodes, 'form');
  form.props.onSubmit({ preventDefault() {} });
  form.props.onSubmit({ preventDefault() {} });
  expect(requests).toEqual([['a', 'c', 'Context']]);
  reject(new Error('offline'));
  await settle();
  nodes = render({ onTie: async (...args) => { requests.push(args); } });
  expect(find(nodes, 'textarea').props.value).toBe('Context');
  expect(nodes.some(node => node.props.role === 'alert')).toBe(true);
  find(nodes, 'form').props.onSubmit({ preventDefault() {} });
  await settle();
  expect(requests).toEqual([['a', 'c', 'Context'], ['a', 'c', 'Context']]);
  expect(find(render(), 'form')).toBeUndefined();
});

test('incoming connections edit and remove the original directed connection', async () => {
  const { render, items, find } = setup();
  items.a.associations = [{ id: 'ab', targetId: 'b', text: 'Shared', targetTitle: 'B' }];
  const edits = [], removals = [];
  let nodes = render({ item: items.b, onUpdateAssociation: async (...args) => edits.push(args), onUntie: async (...args) => removals.push(args) });
  find(nodes, 'button', 'Edit explanation').props.onClick();
  nodes = render();
  expect(find(nodes, 'select')).toBeUndefined();
  find(nodes, 'textarea').props.onChange({ target: { value: '' } });
  find(render(), 'form').props.onSubmit({ preventDefault() {} });
  await settle();
  expect(edits).toEqual([['a', 'ab', '']]);
  find(render(), 'button', 'Remove').props.onClick();
  await settle();
  expect(removals).toEqual([['a', 'ab']]);
});
