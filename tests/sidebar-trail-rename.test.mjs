import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

function setup({ trails = [{ id: 'trail', title: 'Original', itemIds: [] }], items = {} } = {}) {
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
      homeHref: '/projects', projectId: 'project', items, trails,
      onRenameTrail: (...args) => renames.push(args),
      onRenameItem: (...args) => renames.push(args),
    }));
  };
  return { render, renames };
}

test('the trail menu opens the existing rename form and submits a trimmed title', () => {
  const { render, renames } = setup();
  render().find(node => node.type === 'DropdownMenuItem' && node.props.children.includes('Rename trail')).props.onSelect();
  let input = render().find(node => node.type?.name === 'InlineInput');
  expect(input.props.value).toBe('Original');
  input.props.onChange('  Renamed  ');
  input = render().find(node => node.type?.name === 'InlineInput');
  input.props.onSubmit();
  expect(renames).toEqual([['trail', 'Renamed']]);
  expect(render().some(node => node.type?.name === 'InlineInput')).toBe(false);
});

test.each([0, 1, 2])('note rename opens only the input for the selected occurrence %i', occurrence => {
  const { render, renames } = setup({
    items: { note: { id: 'note', title: 'Original' } },
    trails: ['first', 'second'].map(id => ({ id, title: id, itemIds: ['note'] })),
  });
  const menus = render().filter(node => node.type === 'DropdownMenuItem' && node.props.children.includes('Rename note'));
  expect(menus).toHaveLength(3);
  menus[occurrence].props.onSelect();
  let inputs = render().filter(node => node.type?.name === 'InlineInput');
  expect(inputs).toHaveLength(1);
  expect(inputs[0].props.value).toBe('Original');
  inputs[0].props.onChange('  Renamed  ');
  inputs = render().filter(node => node.type?.name === 'InlineInput');
  inputs[0].props.onSubmit();
  expect(renames).toEqual([['note', 'Renamed']]);
  expect(render().some(node => node.type?.name === 'InlineInput')).toBe(false);
});
