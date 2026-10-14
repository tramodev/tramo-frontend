import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

test('the trail menu opens the existing rename form and submits a trimmed title', () => {
  const states = [];
  let state = 0;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('components/editor/sidebar-custom.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: name => ({
      react: {
        useState: value => {
          const i = state++;
          if (!(i in states)) states[i] = value;
          return [states[i], next => { states[i] = next; }];
        },
        useRef: value => ({ current: value }),
        useEffect: () => {},
      },
      'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
      '@/components/ui/sidebar': { useSidebar: () => ({ state: 'expanded', setOpen: () => {} }) },
      '@/components/ui/dropdown-menu': { DropdownMenuItem: 'DropdownMenuItem' },
    })[name] ?? {},
  });
  const renames = [];
  const render = () => {
    state = 0;
    return flatten(exports.SidebarCustom({
      homeHref: '/projects', projectId: 'project', items: {},
      trails: [{ id: 'trail', title: 'Original', itemIds: [] }],
      onRenameTrail: (...args) => renames.push(args),
    }));
  };
  render().find(node => node.type === 'DropdownMenuItem' && node.props.children.includes('Rename trail')).props.onSelect();
  let input = render().find(node => node.type?.name === 'InlineInput');
  expect(input.props.value).toBe('Original');
  input.props.onChange('  Renamed  ');
  input = render().find(node => node.type?.name === 'InlineInput');
  input.props.onSubmit();
  expect(renames).toEqual([['trail', 'Renamed']]);
  expect(render().some(node => node.type?.name === 'InlineInput')).toBe(false);
});
