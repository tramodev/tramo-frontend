import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const exports = {};
let values = [];
let refs = [];
let index = 0;
let refIndex = 0;
runInNewContext(ts.transpileModule(readFileSync('components/editor/connection-comment.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: name => ({
  react: {
    useState: initial => {
      const slot = index++;
      if (!(slot in values)) values[slot] = initial;
      return [values[slot], next => { values[slot] = next; }];
    },
    useRef: initial => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
  },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  '@/app/editor/associations': { CONNECTION_TEXT_LIMIT: 4002 },
})[name] ?? {} });

const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
const render = props => {
  index = refIndex = 0;
  return flatten(exports.ConnectionComment(props));
};
const find = (nodes, type, text) => nodes.find(node => node.type === type && (text === undefined || node.props.children === text));
const settle = () => new Promise(resolve => setImmediate(resolve));

test('a referenced pair creates one saved connection comment', async () => {
  values = [];
  refs = [];
  const items = { a: { associations: [] }, b: { associations: [] } };
  const calls = [];
  const props = { items, sourceId: 'a', targetId: 'b', onTie: async (...args) => calls.push(args), onUpdateAssociation: async () => {} };
  find(render(props), 'button', 'Add connection comment').props.onClick();
  find(render(props), 'textarea').props.onChange({ target: { value: 'Shared context' } });
  const form = find(render(props), 'form');
  form.props.onSubmit({ preventDefault() {} });
  form.props.onSubmit({ preventDefault() {} });
  await settle();
  expect(calls).toEqual([['a', 'b', 'Shared context']]);
});

test('both directions edit the same association', async () => {
  values = [];
  refs = [];
  const association = { id: 'ab', targetId: 'b', text: 'Old context' };
  const items = { a: { associations: [association] }, b: { associations: [{ ...association, targetId: 'a' }] } };
  const calls = [];
  const props = { items, sourceId: 'b', targetId: 'a', displayText: 'Old context\n\nOther context', onTie: async () => {}, onUpdateAssociation: async (...args) => calls.push(args) };
  expect(find(render(props), 'p').props.children).toBe('Old context\n\nOther context');
  find(render(props), 'button', 'Edit connection comment').props.onClick();
  find(render(props), 'textarea').props.onChange({ target: { value: 'Updated context' } });
  find(render(props), 'form').props.onSubmit({ preventDefault() {} });
  await settle();
  expect(calls).toEqual([['b', 'ab', 'Updated context']]);
});
