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
    '@/app/editor/[projectId]/hooks/useVirtualNotes': { useVirtualNotes: () => ({ visibleIds: new Set(), selectionIds: new Set(), heights: new Map() }) },
    ...modules,
  })[name] ?? {}, ...globals });
  return (component, props) => { index = refIndex = 0; return flatten(exports[component](props)); };
}

test('public sidebar separates loose notes and searches every note locally', () => {
  const selected = [], selectedTrails = [], mobile = [];
  const render = load('components/project/public-sidebar.tsx', {
    '@/components/ui/sidebar': { useSidebar: () => ({ state: 'expanded', setOpenMobile: open => mobile.push(open) }) },
    '@/components/ui/input': { Input: 'Input' },
    '@/components/editor/shared-note-indicator': { SharedNoteIndicator: 'SharedNoteIndicator' },
    '@/app/editor/editor-utils': { MIN_SEARCH_LENGTH: 2, searchableText: content => content.toLowerCase() },
  });
  const note = { id: 'a', title: 'Shared note', content: 'Searchable body' };
  const trails = ['one', 'two'].map(id => ({ id, title: id, items: [note] }));
  const loose = { id: 'loose', title: 'Loose note', content: '' };
  const props = { trails, looseItems: [loose], onSelectItem: item => selected.push(item.id), onSelectTrail: id => selectedTrails.push(id) };
  let nodes = render('PublicSidebar', props);
  const titles = nodes.filter(node => node.type === 'span' && node.props.children === note.title);
  expect(titles).toHaveLength(2);
  const indicators = nodes.filter(node => node.type === 'SharedNoteIndicator');
  expect(indicators).toHaveLength(2);
  expect(indicators.every(node => node.props.readOnly && node.props.trails.length === 2)).toBe(true);
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

test('public long projects mount only nearby, selected and text-selected notes', () => {
  const slot = id => `trail:first:item:${id}`;
  let visibleIds = new Set([slot('0'), slot('1')]);
  let selectionIds = new Set();
  let onVisible;
  const render = load('components/project/public-project-view.tsx', {
    '@/components/editor/project-shell': { ProjectShell: 'ProjectShell' },
    '@/components/project/lexical-read-only': { LexicalReadOnly: 'Reader' },
    '@/components/editor/connections-panel': { ConnectionsPanel: 'ConnectionsPanel' },
    '@/components/editor/graph-view': { GraphView: 'GraphView' },
    '@/hooks/use-scroll-spy': { useScrollSpy: options => { onVisible = options.onVisible; } },
    '@/app/editor/[projectId]/hooks/useVirtualNotes': { useVirtualNotes: () => ({ visibleIds, selectionIds, heights: new Map([[slot('1'), 950]]) }) },
  }, { requestAnimationFrame: () => 0 });
  const notes = Array.from({ length: 100 }, (_, i) => ({ id: String(i), title: `Note ${i}`, content: `Body ${i}`, titleAlign: 'left' }));
  const project = { id: 'project', title: 'Project', trails: [{ id: 'first', title: 'First', items: notes }], looseItems: [] };
  const view = () => render('PublicProjectView', { project }).find(node => node.type === 'ProjectShell');
  const readers = shell => flatten(shell.props.content).filter(node => node.type === 'Reader').map(node => node.props.content);
  expect(readers(view())).toEqual(['Body 0', 'Body 1']);
  visibleIds = new Set([slot('97'), slot('98'), slot('99')]);
  onVisible(slot('98'));
  let shell = view();
  expect(readers(shell)).toEqual(['Body 97', 'Body 98', 'Body 99']);
  expect(flatten(shell.props.content).find(node => node.props['data-item-id'] === slot('1')).props.style.height).toBe(950);
  selectionIds = new Set([slot('0'), slot('1')]);
  expect(readers(view())).toEqual(['Body 0', 'Body 1', 'Body 97', 'Body 98', 'Body 99']);
  selectionIds = new Set();
  shell.props.sidebar.props.onSelectItem(notes[75], 'first');
  shell = view();
  expect(readers(shell)).toContain('Body 75');
  expect(shell.props.sidebar.props.selectedItemId).toBe('75');
  flatten(shell.props.content).find(node => node.type === 'ConnectionsPanel').props.onOpenGraph();
  shell = view();
  expect(readers(shell)).toEqual([]);
  flatten(shell.props.content).find(node => node.type === 'GraphView').props.onClose();
  expect(readers(view())).toContain('Body 75');
});

test('all trails and loose notes form one document with distinct shared-note slots and comments last', () => {
  const frames = [], scrolled = [], focused = [];
  let onVisible;
  const render = load('components/project/public-project-view.tsx', {
    '@/components/editor/project-shell': { ProjectShell: 'ProjectShell' },
    '@/components/project/lexical-read-only': { LexicalReadOnly: 'Reader' },
    '@/components/project/comments-section': { CommentsSection: 'Comments' },
    '@/app/editor/[projectId]/hooks/useVirtualNotes': { useVirtualNotes: () => ({ visibleIds: new Set(['trail:second:item:c']), selectionIds: new Set(), heights: new Map() }) },
    '@/hooks/use-scroll-spy': { useScrollSpy: options => { onVisible = options.onVisible; } },
  }, { requestAnimationFrame: callback => frames.push(callback) });
  const note = id => ({ id, title: id.toUpperCase(), content: '', titleAlign: 'left' });
  const shared = note('a');
  const project = { id: 'project', title: 'Project', trails: [
    { id: 'first', title: 'First', description: 'Begin here.', items: [shared, note('b')] },
    { id: 'empty', title: 'Empty', items: [] },
    { id: 'second', title: 'Second', items: [shared, note('c')] },
  ], looseItems: [note('d')] };
  const view = () => render('PublicProjectView', { project }).find(node => node.type === 'ProjectShell');
  const connect = nodes => nodes.filter(node => node.type === 'section' && node.props.ref).forEach(node => node.props.ref({ scrollIntoView: () => scrolled.push(node.props.id), focus: () => focused.push(node.props.id) }));
  const flush = () => { while (frames.length) frames.shift()(); };
  let shell = view();
  const nodes = flatten(shell.props.content);
  connect(nodes);
  expect(nodes.filter(node => node.props['data-section-id']).map(node => node.props.id)).toEqual(['trail:first', 'trail:empty', 'trail:second', 'loose']);
  const steps = nodes.filter(node => node.props['data-note-id']);
  expect(steps.map(node => node.props['data-note-id'])).toEqual(['a', 'b', 'a', 'c', 'd']);
  expect(new Set(steps.map(node => node.key)).size).toBe(5);
  expect(steps.map(node => node.props['data-item-id'])).toEqual(['trail:first:item:a', 'trail:first:item:b', 'trail:second:item:a', 'trail:second:item:c', 'loose:item:d']);
  expect(nodes.filter(node => node.type === 'Comments')).toHaveLength(1);
  expect(nodes.findIndex(node => node.type === 'Comments')).toBeGreaterThan(nodes.indexOf(steps.at(-1)));
  expect(nodes.some(node => node.props.children === 'Begin here.')).toBe(true);
  expect(nodes.some(node => node.props.children === 'This trail has no notes yet.')).toBe(true);
  shell.props.sidebar.props.onSelectTrail('second');
  shell = view();
  connect(flatten(shell.props.content));
  flush();
  expect(scrolled.at(-1)).toBe('trail:second');
  expect(shell.props.sidebar.props.activeTrailId).toBe('second');
  expect(shell.props.sidebar.props.selectedItemId).toBe('a');
  expect(flatten(shell.props.content).filter(node => node.props['data-note-id'])).toHaveLength(5);
  shell.props.sidebar.props.onSelectItem(shared, 'first');
  shell = view(); flush();
  expect(scrolled.at(-1)).toBe('trail:first:item:a');
  expect(focused.at(-1)).toBe('trail:first:item:a');
  expect(shell.props.sidebar.props.activeTrailId).toBe('first');
  const secondNote = flatten(shell.props.content).find(node => node.props['data-item-id'] === 'trail:second:item:c');
  flatten(secondNote).find(node => node.type === 'Reader').props.onItemClick('a');
  shell = view();
  expect(shell.props.sidebar.props.activeTrailId).toBe('second');
  expect(shell.props.sidebar.props.selectedItemId).toBe('a');
  onVisible('trail:second:item:a');
  shell = view();
  expect(shell.props.sidebar.props.activeTrailId).toBe('second');
  expect(shell.props.sidebar.props.selectedItemId).toBe('a');
  onVisible('loose:item:d');
  shell = view();
  expect(shell.props.sidebar.props.activeTrailId).toBeUndefined();
  expect(shell.props.sidebar.props.selectedItemId).toBe('d');
  shell.props.sidebar.props.onSelectTrail('empty');
  shell = view(); flush();
  expect(scrolled.at(-1)).toBe('trail:empty');
  expect(shell.props.sidebar.props.activeTrailId).toBe('empty');
  expect(shell.props.sidebar.props.selectedItemId).toBeUndefined();
  shell.props.sidebar.props.onSelectItem(note('c'), 'second');
  shell = view();
  expect(shell.props.sidebar.props.selectedItemId).toBe('c');
  const reader = flatten(shell.props.content).find(node => node.type === 'Reader');
  reader.props.onItemClick('b');
  shell = view();
  expect(shell.props.sidebar.props.activeTrailId).toBe('first');
  expect(shell.props.sidebar.props.selectedItemId).toBe('b');
});

test('jumping to comments follows virtual note resizing until user input or navigation', () => {
  const cleanups = [], observers = [], scrolled = [], focused = [];
  const listeners = new Map();
  const column = {
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: type => listeners.delete(type),
  };
  const content = {};
  const comments = {
    parentElement: content,
    scrollIntoView: options => scrolled.push(options),
    focus: options => focused.push(options),
  };
  const render = load('components/project/public-project-view.tsx', {
    react: {
      useState: value => [typeof value === 'function' ? value() : value, () => {}],
      useMemo: calculate => calculate(),
      useRef: current => ({ current }),
      useEffect: effect => cleanups.push(effect()),
    },
    '@/components/editor/project-shell': { ProjectShell: 'ProjectShell' },
    '@/hooks/use-scroll-spy': { useScrollSpy() {} },
  }, {
    requestAnimationFrame: () => 0,
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
    },
  });
  const project = { id: 'project', title: 'Project', trails: [], looseItems: [] };
  const shell = render('PublicProjectView', { project }).find(node => node.type === 'ProjectShell');
  const nodes = flatten(shell.props.content);
  nodes.find(node => node.props.className === 'editor-inner').props.ref.current = column;
  nodes.find(node => node.props.className === 'mt-8 border-t border-border').props.ref.current = comments;
  const link = flatten(shell.props.actions).find(node => node.props.href === '#comments');
  let prevented = false;
  const jump = () => link.props.onClick({ preventDefault: () => { prevented = true; } });
  jump();
  expect(prevented).toBe(true);
  expect(observers[0].target).toBe(content);
  expect(scrolled).toEqual([{ block: 'start', behavior: 'instant' }]);
  expect(focused).toEqual([{ preventScroll: true }]);
  observers[0].callback();
  observers[0].callback();
  expect(scrolled).toHaveLength(3);
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    if (!listeners.has(type)) jump();
    listeners.get(type)();
    expect(observers.at(-1).disconnected).toBe(true);
    expect(listeners.size).toBe(0);
  }
  jump();
  shell.props.sidebar.props.onSelectTrail('other');
  expect(observers.at(-1).disconnected).toBe(true);
  expect(listeners.size).toBe(0);
  jump();
  cleanups.forEach(cleanup => cleanup?.());
  expect(observers.at(-1).disconnected).toBe(true);
  expect(listeners.size).toBe(0);
});

test('empty public projects still render their introduction and project comments', () => {
  const render = load('components/project/public-project-view.tsx', {
    '@/components/editor/project-shell': { ProjectShell: 'ProjectShell' },
    '@/components/project/comments-section': { CommentsSection: 'Comments' },
    '@/hooks/use-scroll-spy': { useScrollSpy() {} },
  });
  const project = { id: 'empty', title: 'Empty project', trails: [], looseItems: [] };
  const shell = render('PublicProjectView', { project }).find(node => node.type === 'ProjectShell');
  const nodes = flatten(shell.props.content);
  expect(nodes.some(node => node.props.children === 'This project has no published notes yet')).toBe(true);
  expect(nodes.filter(node => node.type === 'Comments')).toHaveLength(1);
});

test('trail headings in the sidebar jump to the section independently from collapse controls', () => {
  const selected = [], mobile = [];
  const render = load('components/project/public-sidebar.tsx', {
    '@/components/ui/sidebar': { useSidebar: () => ({ state: 'expanded', setOpenMobile: value => mobile.push(value) }), SidebarMenuButton: 'SidebarMenuButton' },
    '@/components/ui/collapsible': { CollapsibleTrigger: 'CollapsibleTrigger' },
    '@/app/editor/editor-utils': { searchableText: () => '' },
  });
  const nodes = render('PublicSidebar', { trails: [{ id: 'trail', title: 'Chapter', items: [] }], looseItems: [], onSelectTrail: id => selected.push(id) });
  const heading = nodes.find(node => node.type === 'SidebarMenuButton' && flatten(node).some(child => child.props.children === 'Chapter'));
  heading.props.onClick();
  expect(selected).toEqual(['trail']);
  expect(mobile).toEqual([false]);
  expect(nodes.some(node => node.type === 'button' && node.props['aria-label'] === 'Toggle Chapter')).toBe(true);
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

test('editor trail rows and the notes list use the same shared-note indicator', () => {
  const render = load('components/editor/sidebar-custom.tsx', {
    '@/components/ui/sidebar': { useSidebar: () => ({ state: 'expanded' }) },
    '@/components/editor/shared-note-indicator': { SharedNoteIndicator: 'SharedNoteIndicator' },
  });
  const items = { shared: { id: 'shared', title: 'Shared' }, single: { id: 'single', title: 'Single' } };
  const trails = [{ id: 'one', title: 'One', itemIds: ['shared', 'single'] }, { id: 'two', title: 'Two', itemIds: ['shared'] }];
  const nodes = render('SidebarCustom', { items, trails });
  const trailIndicators = flatten(nodes.find(node => node.props.className === 'group/trails')).filter(node => node.type === 'SharedNoteIndicator');
  expect(trailIndicators.filter(node => node.props.trails.length === 2)).toHaveLength(2);
  expect(trailIndicators.filter(node => node.props.trails.length === 1)).toHaveLength(1);
  const noteIndicators = flatten(nodes.find(node => node.props.className === 'group/items')).filter(node => node.type === 'SharedNoteIndicator');
  expect(noteIndicators.filter(node => node.props.trails.length === 2)).toHaveLength(1);
});

test('shared-note tooltips explain trail membership and hide for single-trail notes', () => {
  const render = load('components/editor/shared-note-indicator.tsx', { 'lucide-react': { Link2: 'Link2' } });
  expect(render('SharedNoteIndicator', { trails: [] })).toHaveLength(0);
  expect(render('SharedNoteIndicator', { trails: [{ title: 'One' }] })).toHaveLength(0);
  const trails = [{ title: 'One' }, { title: 'Two' }];
  for (const readOnly of [true, false]) {
    const nodes = render('SharedNoteIndicator', { trails, readOnly });
    expect(nodes.find(node => node.type === 'Link2').props['aria-label']).toBe('Used in 2 trails');
    expect(nodes.find(node => node.type === 'p').props.children.join('')).toBe('Used in 2 trails: One, Two');
    expect(nodes.some(node => node.props.children === 'Edits appear in every trail that uses this note.')).toBe(!readOnly);
  }
});
