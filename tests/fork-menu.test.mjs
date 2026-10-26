import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
const jsx = (type, props, key) => ({ type, props, key });
function load(path, modules = {}, globals = {}) {
  const exports = {};
  const states = [];
  const refs = [];
  let index = 0, refIndex = 0;
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => ({
    react: {
      useState: value => {
        const slot = index++;
        if (!(slot in states)) states[slot] = typeof value === 'function' ? value() : value;
        return [states[slot], next => { states[slot] = typeof next === 'function' ? next(states[slot]) : next; }];
      },
      useMemo: calculate => calculate(),
      useRef: value => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
      useEffect: () => {},
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    '@/hooks/use-mounted': { useMounted: () => true },
    '@/app/editor/[projectId]/hooks/useVirtualNotes': { useVirtualNotes: () => ({ visibleIds: new Set(), selectionIds: new Set(), heights: new Map() }) },
    ...modules,
  })[name] ?? {}, ...globals });
  return (component, props) => { index = refIndex = 0; return flatten(exports[component](props)); };
}

test('menu forks reject duplicate clicks, show failures, and allow retry', async () => {
  let calls = 0;
  let rejectFork;
  let fail = true;
  const routes = [];
  const render = load('components/project/post-options-menu.tsx', {
    'next/navigation': { useRouter: () => ({ push: path => routes.push(path) }) },
    '@/lib/projects-store': { forkProject: async () => {
      calls++;
      if (fail) return new Promise((resolve, reject) => { rejectFork = reject; });
      return { id: 'fork' };
    } },
  });
  const props = { projectId: 'original', ownerUsername: 'alice', isLoggedIn: true };
  const forkItem = () => render('PostOptionsMenu', props).find(node => node.props.onSelect &&
    Array.isArray(node.props.children) && node.props.children.includes('Fork this project'));
  const action = forkItem().props.onSelect;
  const pending = action();
  await action();
  expect(calls).toBe(1);
  expect(render('PostOptionsMenu', props).find(node => node.props.onSelect &&
    Array.isArray(node.props.children) && node.props.children.includes('Forking...')).props.disabled).toBe(true);
  rejectFork(new Error('Failed'));
  await pending;
  expect(routes).toEqual([]);
  expect(render('PostOptionsMenu', props).find(node => node.props.role === 'alert').props.children)
    .toContain('Fork failed');
  expect(forkItem().props.disabled).toBe(false);
  fail = false;
  await forkItem().props.onSelect();
  expect(calls).toBe(2);
  expect(routes).toEqual(['/editor/fork']);
  expect(render('PostOptionsMenu', props).some(node => node.props.role === 'alert')).toBe(false);
});
