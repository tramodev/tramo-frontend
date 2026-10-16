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
  const moves = [];
  const reorders = [];
  const trailReorders = [];
  const render = () => {
    state = 0;
    return flatten(exports.SidebarCustom({
      homeHref: '/projects', projectId: 'project', items, trails,
      onRenameTrail: (...args) => renames.push(args),
      onRenameItem: (...args) => renames.push(args),
      onMoveItemToTrail: async (...args) => { moves.push(args); },
      onReorderTrailItems: (...args) => reorders.push(args),
      onReorderTrails: ids => trailReorders.push(ids),
    }));
  };
  return { render, renames, moves, reorders, trailReorders };
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

test('a note can be moved by menu or dropped onto an empty trail header', () => {
  const { render, moves } = setup({
    items: { note: { id: 'note', title: 'Note' } },
    trails: [{ id: 'source', title: 'Source', itemIds: ['note'] }, { id: 'target', title: 'Target', itemIds: [] }],
  });
  render().find(node => node.type === 'DropdownMenuItem' && node.props.children.includes('Move to another trail')).props.onSelect();
  const picker = render().find(node => node.type?.name === 'AddToTrailSelect');
  expect(Array.from(picker.props.trails, trail => trail.id)).toEqual(['target']);
  picker.props.onPick('target');
  expect(moves).toEqual([['source', 'target', 'note', undefined]]);
  const row = render().find(node => node.props.draggable && node.props.className?.includes('group/item'));
  row.props.onDragStart({ dataTransfer: {} });
  let header = render().filter(node => node.props.onDrop && node.props.className?.includes('group/trail'))[1];
  let prevented = false;
  header.props.onDragOver({ preventDefault: () => { prevented = true; }, dataTransfer: {} });
  expect(prevented).toBe(true);
  header = render().filter(node => node.props.onDrop && node.props.className?.includes('group/trail'))[1];
  expect(header.props.className).toContain('ring-primary');
  header.props.onDrop({ preventDefault() {}, stopPropagation() {} });
  expect(moves).toEqual([['source', 'target', 'note', undefined], ['source', 'target', 'note', undefined]]);
});

test.each([[5, 0], [15, 1]])('dropping at y=%i inserts at destination position %i', (clientY, position) => {
  const { render, moves } = setup({
    items: { a: { id: 'a', title: 'A' }, b: { id: 'b', title: 'B' } },
    trails: [{ id: 'source', title: 'Source', itemIds: ['a'] }, { id: 'target', title: 'Target', itemIds: ['b'] }],
  });
  render().filter(node => node.props.draggable && node.props.className?.includes('group/item'))[0].props.onDragStart({ dataTransfer: {} });
  let target = render().filter(node => node.props.draggable && node.props.className?.includes('group/item'))[1];
  target.props.onDragOver({ preventDefault() {}, dataTransfer: {}, clientY, currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 20 }) } });
  target = render().filter(node => node.props.draggable && node.props.className?.includes('group/item'))[1];
  expect(target.props.className).toContain(position === 0 ? 'before:bg-primary' : 'after:bg-primary');
  target.props.onDrop({ preventDefault() {}, stopPropagation() {} });
  expect(moves).toEqual([['source', 'target', 'a', position]]);
});

test('same-trail drops still reorder correctly using insertion boundaries', () => {
  const { render, reorders } = setup({
    items: Object.fromEntries(['a', 'b', 'c'].map(id => [id, { id, title: id }])),
    trails: [{ id: 'source', title: 'Source', itemIds: ['a', 'b', 'c'] }],
  });
  render().filter(node => node.props.draggable && node.props.className?.includes('group/item'))[0].props.onDragStart({ dataTransfer: {} });
  render().filter(node => node.props.draggable && node.props.className?.includes('group/item'))[2].props.onDragOver({ preventDefault() {}, dataTransfer: {}, clientY: 15, currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 20 }) } });
  render().filter(node => node.props.draggable && node.props.className?.includes('group/item'))[2].props.onDrop({ preventDefault() {}, stopPropagation() {} });
  expect(reorders).toEqual([['source', ['b', 'c', 'a']]]);
});

test.each([[0, 2, 15, ['b', 'c', 'a']], [2, 0, 5, ['c', 'a', 'b']]])('trail headers drag from %i to %i', (from, target, clientY, expected) => {
  const { render, trailReorders, moves, reorders } = setup({ trails: ['a', 'b', 'c'].map(id => ({ id, title: id, itemIds: [] })) });
  const headers = () => render().filter(node => node.props.draggable && node.props.className?.includes('group/trail'));
  headers()[from].props.onDragStart({ stopPropagation() {}, dataTransfer: { setData() {} } });
  headers()[target].props.onDragOver({ preventDefault() {}, dataTransfer: {}, clientY, currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 20 }) } });
  expect(render().some(node => node.props['aria-hidden'] === 'true' && node.props.className?.includes('bg-primary'))).toBe(true);
  headers()[target].props.onDrop({ preventDefault() {}, stopPropagation() {} });
  expect(trailReorders).toEqual([expected]);
  expect(moves).toHaveLength(0);
  expect(reorders).toHaveLength(0);
});

test('trail menus allow reordering without drag and disable boundary actions', () => {
  const { render, trailReorders } = setup({ trails: ['a', 'b'].map(id => ({ id, title: id, itemIds: [] })) });
  const actions = label => render().filter(node => node.type === 'DropdownMenuItem' && node.props.children.includes(label));
  expect(actions('Move trail up')[0].props.disabled).toBe(true);
  expect(actions('Move trail down')[1].props.disabled).toBe(true);
  actions('Move trail up')[1].props.onSelect();
  expect(trailReorders).toEqual([['b', 'a']]);
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
