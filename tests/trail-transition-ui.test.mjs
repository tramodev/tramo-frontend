import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const exports = {};
const jsx = (type, props) => ({ type, props });
runInNewContext(source('app/editor/[projectId]/components/WriteView.tsx'), {
  exports,
  require: name => ({
    react: { useState: value => [value, () => {}], useRef: value => ({ current: value }), useMemo: fn => fn(), useCallback: fn => fn, useEffect: () => {} },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    '@/hooks/use-scroll-spy': { useScrollSpy: () => {} },
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
  const items = Object.fromEntries(['a', 'b', 'c'].map(id => [id, { id, title: id.toUpperCase(), content: '' }]));
  const trail = { id: 'trail', itemIds: ['a', 'b', 'c'], steps: ['a', 'b', 'c'].map(itemId => ({ itemId })) };
  return {
    item: items.a, items, trail, trails: [trail], projectId: 'project', connectionsPanelOpen: open,
    onVisibleItem: id => visible.push(id), onToggleConnectionsPanelOpen: () => toggles++,
    onSelectItem: item => selected.push(item.id), onDismissReorderNotice: () => dismissals++,
    visible, selected, toggles: () => toggles, dismissals: () => dismissals,
  };
}

test('separators are visual and the connections panel keeps its open state', () => {
  for (const open of [false, true]) {
    const p = props(open);
    const nodes = flatten(exports.WriteView(p));
    const connectors = nodes.filter(node => node.type === 'TrailConnector');
    expect(connectors).toHaveLength(2);
    expect(connectors.every(node => Object.keys(node.props).length === 0)).toBe(true);
    const panel = nodes.find(node => node.type === 'ConnectionsPanel');
    expect(panel.props.item.id).toBe('a');
    expect(panel.props.open).toBe(open);
  }
});

test('failed reorder has an accessible dismissible alert', () => {
  const p = props();
  const nodes = flatten(exports.WriteView({ ...p, reorderNotice: { error: 'Could not reorder' } }));
  const notice = nodes.find(node => node.props.role === 'alert');
  expect(notice).toBeDefined();
  flatten(notice).find(node => node.type === 'button' && node.props.children === 'Dismiss').props.onClick();
  expect(p.dismissals()).toBe(1);
});
