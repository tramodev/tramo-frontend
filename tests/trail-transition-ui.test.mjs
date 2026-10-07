import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const associations = {};
runInNewContext(source('app/editor/associations.ts'), { exports: associations, require: () => ({}) });
const exports = {};
const jsx = (type, props) => ({ type, props });
runInNewContext(source('app/editor/[projectId]/components/WriteView.tsx'), {
  exports,
  require: name => ({
    react: { useState: value => [value, () => {}], useRef: value => ({ current: value }), useMemo: fn => fn(), useCallback: fn => fn, useEffect: () => {} },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    '@/hooks/use-scroll-spy': { useScrollSpy: () => {} },
    '../../associations': associations,
    '@/components/editor/connections-panel': { ConnectionsPanel: 'ConnectionsPanel' },
    '@/components/editor/trail-connector': { TrailConnector: 'TrailConnector' },
    '@/components/editor/editor-images-provider': { EditorImagesProvider: 'EditorImagesProvider' },
  })[name] ?? {},
});
function flatten(element) {
  if (Array.isArray(element)) return element.flatMap(flatten);
  if (!element?.props) return [];
  return [element, ...flatten(element.props.children)];
}
function props(open = false) {
  const visible = [], selected = [];
  let toggles = 0, dismissals = 0;
  const ab = { id: 'ab', type: 'RELATED', targetType: 'ITEM', targetId: 'b', targetTitle: 'B' };
  const items = Object.fromEntries(['a', 'b', 'c'].map(id => [id, { id, title: id.toUpperCase(), content: '', associations: id === 'a' ? [ab] : [] }]));
  const trail = { id: 'trail', itemIds: ['a', 'b', 'c'], steps: ['a', 'b', 'c'].map(itemId => ({ itemId, annotation: null, associationId: itemId === 'c' ? 'ab' : null })) };
  return {
    item: items.a, items, trail, trails: [trail], projectId: 'project', connectionsPanelOpen: open,
    onVisibleItem: id => visible.push(id), onToggleConnectionsPanelOpen: () => toggles++,
    onSelectItem: item => selected.push(item.id), onDismissReorderNotice: () => dismissals++,
    visible, selected, toggles: () => toggles, dismissals: () => dismissals,
  };
}

test('separators ignore stale explicit associations and the connections button selects its note without toggling an open panel closed', () => {
  for (const open of [false, true]) {
    const p = props(open);
    const nodes = flatten(exports.WriteView(p));
    const connectors = nodes.filter(node => node.type === 'TrailConnector');
    expect(connectors[0].props.ties).toHaveLength(1);
    expect(connectors[1].props.ties).toHaveLength(0);
    const buttons = nodes.filter(node => node.type === 'button' && node.props['aria-controls'] === 'editor-connections');
    expect(buttons.map(node => node.props['aria-label'])).toEqual(['Connections for A: 1', 'Connections for B: 1', 'Connections for C: 0']);
    buttons[1].props.onClick();
    expect(p.visible).toEqual(['b']);
    expect(p.toggles()).toBe(open ? 0 : 1);
  }
});

test('review notice exposes navigation and dismissal while failed saves use an accessible alert', () => {
  const p = props();
  let nodes = flatten(exports.WriteView({ ...p, reorderNotice: { reviewItemIds: ['b'] } }));
  const notice = nodes.find(node => node.props.role === 'status' && node.props.className?.includes('border-border'));
  expect(notice).toBeDefined();
  flatten(notice).find(node => node.type === 'button' && node.props.children === 'B').props.onClick();
  expect(p.selected).toEqual(['b']);
  flatten(notice).find(node => node.type === 'button' && node.props.children === 'Dismiss').props.onClick();
  expect(p.dismissals()).toBe(1);
  nodes = flatten(exports.WriteView({ ...p, reorderNotice: { reviewItemIds: [], error: 'Could not reorder' } }));
  expect(nodes.some(node => node.props.role === 'alert')).toBe(true);
});
