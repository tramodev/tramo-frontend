import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
const jsx = (type, props) => ({ type, props });
function load(path, modules = {}) {
  const exports = {};
  const states = [];
  let index = 0;
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
      useRef: value => ({ current: value }),
      useEffect: () => {},
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    ...modules,
  })[name] ?? {} });
  return (component, props) => { index = 0; return flatten(exports[component](props)); };
}

test('public sidebar separates loose notes and searches every note locally', () => {
  const selected = [], selectedTrails = [], mobile = [];
  const render = load('components/project/public-sidebar.tsx', {
    '@/components/ui/sidebar': { useSidebar: () => ({ state: 'expanded', setOpenMobile: open => mobile.push(open) }) },
    '@/components/ui/input': { Input: 'Input' },
    '@/app/editor/editor-utils': { MIN_SEARCH_LENGTH: 2, searchableText: content => content.toLowerCase() },
  });
  const note = { id: 'a', title: 'Shared note', content: 'Searchable body' };
  const trails = ['one', 'two'].map(id => ({ id, title: id, items: [note] }));
  const loose = { id: 'loose', title: 'Loose note', content: '' };
  const props = { trails, looseItems: [loose], onSelectItem: item => selected.push(item.id), onSelectTrail: id => selectedTrails.push(id) };
  let nodes = render('PublicSidebar', props);
  const titles = nodes.filter(node => node.type === 'span' && node.props.children === note.title);
  expect(titles).toHaveLength(2);
  const looseSection = nodes.find(node => node.props.className === 'group/items');
  expect(flatten(looseSection).some(node => node.type === 'span' && node.props.children === note.title)).toBe(false);
  expect(flatten(looseSection).filter(node => node.type === 'span' && node.props.children === loose.title)).toHaveLength(1);
  expect(flatten(looseSection).some(node => node.type === 'span' && node.props.children === 1)).toBe(true);
  expect(flatten(looseSection).some(node => node.type === 'button' && node.props.children.includes('Notes without a trail'))).toBe(true);
  nodes.find(node => node.type === 'Input').props.onChange({ target: { value: 'Searchable' } });
  nodes = render('PublicSidebar', props);
  const result = nodes.find(node => node.props.onClick && flatten(node).some(child => child.props.children === note.title));
  result.props.onClick();
  expect(selected).toEqual(['a']);
  expect(mobile).toEqual([false]);
  nodes = render('PublicSidebar', props);
  expect(nodes.find(node => node.type === 'Input').props.value).toBe('');
  nodes.find(node => node.type === 'Input').props.onChange({ target: { value: 'two' } });
  nodes = render('PublicSidebar', props);
  nodes.find(node => node.props.onClick && flatten(node).some(child => child.props.children === 'two')).props.onClick();
  expect(selectedTrails).toEqual(['two']);
});

test('public reader shares the editor column and connections panel without mutation actions', () => {
  const render = load('components/project/public-project-view.tsx', {
    '@/components/editor/project-shell': { ProjectShell: 'ProjectShell' },
    '@/components/editor/connections-panel': { ConnectionsPanel: 'ConnectionsPanel' },
    '@/components/project/public-sidebar': { PublicSidebar: 'PublicSidebar' },
    '@/hooks/use-scroll-spy': { useScrollSpy: () => {} },
    '@/app/editor/trail-navigation': { firstReadableTrail: trails => trails[0] },
  });
  const project = { id: 'project', title: 'Project', ownerUsername: 'author', trails: [], looseItems: [{ id: 'a', title: 'A', content: '', titleAlign: 'left' }] };
  const nodes = render('PublicProjectView', { project });
  const shell = nodes.find(node => node.type === 'ProjectShell');
  const content = flatten(shell.props.content);
  expect(content.some(node => node.props.className === 'editor-inner')).toBe(true);
  expect(content.some(node => node.props.className === 'editor-content-column')).toBe(true);
  const intro = content.find(node => node.props['aria-label'] === 'About this project');
  expect(flatten(intro).some(node => node.type === 'button')).toBe(false);
  expect(content.some(node => node.props['aria-label'] === 'Current trail')).toBe(false);
  const panel = content.find(node => node.type === 'ConnectionsPanel');
  expect(panel.props.readOnly).toBe(true);
  expect(panel.props.item.id).toBe('a');
  panel.props.onToggleOpen();
  const next = render('PublicProjectView', { project }).find(node => node.type === 'ProjectShell');
  expect(flatten(next.props.content).find(node => node.type === 'ConnectionsPanel').props.open).toBe(true);
  expect(Object.keys(shell.props.sidebar.props).some(key => /Create|Delete|Rename|Reorder/.test(key))).toBe(false);
});

test('read-only text uses the editor node configuration and never enables editing', () => {
  const config = { nodes: ['image', 'equation', 'music', 'embed', 'table'], theme: { paragraph: 'editor-paragraph' } };
  const render = load('components/project/lexical-read-only.tsx', {
    '@lexical/react/LexicalComposer': { LexicalComposer: 'LexicalComposer' },
    '@/app/editor/lexical-config': { editorConfig: config },
  });
  const content = '{"root":{"children":[]}}';
  const composer = render('LexicalReadOnly', { content }).find(node => node.type === 'LexicalComposer');
  expect(composer.props.initialConfig.nodes).toBe(config.nodes);
  expect(composer.props.initialConfig.theme).toBe(config.theme);
  expect(composer.props.initialConfig.editorState).toBe(content);
  expect(composer.props.initialConfig.editable).toBe(false);
});

test('the next-trail button appears after the last note and opens the following trail', () => {
  const render = load('components/project/public-project-view.tsx', {
    '@/components/editor/project-shell': { ProjectShell: 'ProjectShell' },
    '@/components/editor/next-trail-button': { NextTrailButton: 'NextTrailButton' },
    '@/hooks/use-scroll-spy': { useScrollSpy: () => {} },
    '@/app/editor/trail-navigation': { firstReadableTrail: trails => trails[0] },
  });
  const note = id => ({ id, title: id.toUpperCase(), content: '', titleAlign: 'left' });
  const project = { id: 'project', title: 'Project', trails: [
    { id: 'first', title: 'First', description: 'Begin here.', items: [note('a'), note('b')] },
    { id: 'second', title: 'Second', items: [note('c')] },
  ], looseItems: [] };
  let shell = render('PublicProjectView', { project }).find(node => node.type === 'ProjectShell');
  const nodes = flatten(shell.props.content);
  const intro = nodes.find(node => node.props['aria-label'] === 'About this project');
  expect(flatten(intro).some(node => node.type === 'button')).toBe(false);
  const heading = flatten(nodes.find(node => node.props['aria-label'] === 'Current trail'));
  expect(heading.some(node => node.type === 'h2' && node.props.children === 'First')).toBe(true);
  expect(heading.some(node => node.type === 'p' && node.props.children === 'Begin here.')).toBe(true);
  expect(heading.find(node => node.type === 'span').props.children.join('')).toBe('· 2 notes');
  const buttons = nodes.filter(node => node.type === 'NextTrailButton');
  expect(buttons).toHaveLength(1);
  expect(buttons[0].props.trail.id).toBe('second');
  expect(buttons[0].props.children).toBeUndefined();
  const steps = nodes.filter(node => node.type === 'section' && node.props['aria-label']?.startsWith('Step'));
  expect(flatten(steps[0]).some(node => node.type === 'NextTrailButton')).toBe(false);
  expect(flatten(steps[1]).some(node => node.type === 'NextTrailButton')).toBe(true);
  buttons[0].props.onSelectTrail('second');
  shell = render('PublicProjectView', { project }).find(node => node.type === 'ProjectShell');
  expect(shell.props.sidebar.props.activeTrailId).toBe('second');
  expect(shell.props.sidebar.props.selectedItemId).toBe('c');
  const nextHeading = flatten(flatten(shell.props.content).find(node => node.props['aria-label'] === 'Current trail'));
  expect(nextHeading.some(node => node.type === 'h2' && node.props.children === 'Second')).toBe(true);
  expect(nextHeading.find(node => node.type === 'span').props.children.join('')).toBe('· 1 note');
  expect(flatten(shell.props.content).some(node => node.type === 'NextTrailButton')).toBe(false);
});

test('the shared next-trail button keeps its label, click action and editor shortcut', () => {
  const render = load('components/editor/next-trail-button.tsx');
  const selected = [];
  const shortcut = jsx('kbd', { children: '⌘⌥→' });
  const nodes = render('NextTrailButton', { trail: { id: 'next', title: 'Next' }, onSelectTrail: id => selected.push(id), children: shortcut });
  const button = nodes.find(node => node.type === 'button');
  expect(button.props.children).toContain('Next');
  expect(nodes.find(node => node.type === 'kbd')).toBe(shortcut);
  button.props.onClick();
  expect(selected).toEqual(['next']);
});
