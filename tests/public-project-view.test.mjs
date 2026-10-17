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

test('one history panel has two tabs and loads publications only when selected', async () => {
  const requests = [];
  const render = load('components/editor/project-history-sheet.tsx', {
    '@/components/ui/sheet': { Sheet: 'Sheet', SheetTrigger: 'SheetTrigger' },
    'radix-ui': { Tabs: { Root: 'Tabs', List: 'TabList', Trigger: 'Tab', Content: 'TabContent' } },
    '@/lib/project-history': { getProjectHistory: async id => {
      requests.push(`drafts:${id}`);
      return { versions: [], nextCursor: null, unavailable: false };
    } },
    '@/lib/project-snapshots': { getProjectSnapshots: async id => {
      requests.push(`publications:${id}`);
      return [{ id: '42', version: 3, createdAt: '2026-10-17T12:00:00Z' }];
    } },
    'next/link': { default: 'Link' },
  });
  const props = { projectId: 'project', restoreEpoch: 0, beforeSave: async () => {} };
  let nodes = render('ProjectHistorySheet', props);
  expect(nodes.filter(node => node.type === 'SheetTrigger')).toHaveLength(1);
  expect(nodes.filter(node => node.type === 'Tab').map(node => flatten(node)[1].props.children)).toEqual(['Project history', 'Publish history']);
  await nodes.find(node => node.type === 'Sheet').props.onOpenChange(true);
  expect(requests).toEqual(['drafts:project']);
  nodes = render('ProjectHistorySheet', props);
  expect(nodes.find(node => node.type === 'Tabs').props.value).toBe('project');
  await nodes.find(node => node.type === 'Tabs').props.onValueChange('publish');
  nodes = render('ProjectHistorySheet', props);
  expect(nodes.find(node => node.type === 'Tabs').props.value).toBe('publish');
  const link = nodes.find(node => node.type === 'Link');
  expect(requests).toEqual(['drafts:project', 'publications:project']);
  expect(link.props.href).toBe('/p/project/versions/42');
  expect(link.props.target).toBe('_blank');
  expect(link.props['aria-label']).toBe('Open version 3 in a new tab');
  nodes.find(node => node.type === 'Tabs').props.onValueChange('project');
  nodes.find(node => node.type === 'Sheet').props.onOpenChange(false);
  nodes.find(node => node.type === 'Sheet').props.onOpenChange(true);
  expect(render('ProjectHistorySheet', props).find(node => node.type === 'Tabs').props.value).toBe('project');
});

test('publish history reports loading failures and retries inside the shared panel', async () => {
  let attempts = 0;
  const render = load('components/editor/project-history-sheet.tsx', {
    '@/components/ui/sheet': { Sheet: 'Sheet' },
    '@/components/ui/button': { Button: 'Button' },
    'radix-ui': { Tabs: { Root: 'Tabs', Trigger: 'Tab', Content: 'TabContent' } },
    '@/lib/project-snapshots': { getProjectSnapshots: async () => { if (++attempts === 1) throw new Error('Offline'); return []; } },
  }, { Error });
  const props = { projectId: 'project', restoreEpoch: 0, beforeSave: async () => {} };
  await render('ProjectHistorySheet', props).find(node => node.type === 'Tabs').props.onValueChange('publish');
  let nodes = render('ProjectHistorySheet', props);
  expect(nodes.find(node => node.props.role === 'alert').props.children[0]).toBe('Offline');
  nodes.find(node => node.type === 'Button' && node.props.children === 'Retry').props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  nodes = render('ProjectHistorySheet', props);
  expect(nodes.some(node => node.props.children === 'No published versions yet.')).toBe(true);
  expect(attempts).toBe(2);
});


test('historical publications use the public reader and resolve images from the saved version', () => {
  const render = load('components/project/public-project-view.tsx', {
    '@/components/editor/project-shell': { ProjectShell: 'ProjectShell' },
    '@/components/editor/editor-images-provider': { EditorImagesProvider: 'Images' },
    '@/components/project/public-sidebar': { PublicSidebar: 'Sidebar' },
    '@/components/project/lexical-read-only': { LexicalReadOnly: 'Reader' },
    '@/components/project/comments-section': { CommentsSection: 'Comments' },
    '@/components/social/fork-button': { ForkButton: 'Fork' },
    '@/components/social/share-to-followers-button': { ShareToFollowersButton: 'Share' },
    '@/hooks/use-scroll-spy': { useScrollSpy() {} },
    'next/link': { default: 'Link' },
  });
  const item = { id: 'old-note', title: 'Old note', titleAlign: 'right', content: 'Saved content' };
  const project = { id: 'project', title: 'Old title', trails: [], looseItems: [item], canFork: true };
  const snapshot = { id: '42', version: 3, createdAt: '2026-10-17T12:00:00Z' };
  const nodes = render('PublicProjectView', { project, snapshot, isLoggedIn: true });
  expect(nodes.find(node => node.type === 'Images').props.snapshotId).toBe(42);
  const shell = nodes.find(node => node.type === 'ProjectShell');
  expect(shell.props.sidebar.props.looseItems).toEqual([item]);
  const content = flatten(shell.props.content);
  expect(content.find(node => node.type === 'Reader').props.content).toBe('Saved content');
  expect(content.find(node => node.type === 'h3').props.style.textAlign).toBe('right');
  expect(content.some(node => node.type === 'Comments')).toBe(false);
  expect(content.find(node => node.type === 'Link').props.href).toBe('/p/project');
  expect(flatten(shell.props.actions).some(node => ['Fork', 'Share'].includes(node.type) || node.props.href === '#comments')).toBe(false);
});

test('historical dates keep the server text during hydration and use browser formatting after mount', () => {
  let mounted = false;
  let formatted = 0;
  const render = load('components/project/public-project-view.tsx', {
    '@/components/editor/project-shell': { ProjectShell: 'ProjectShell' },
    '@/hooks/use-mounted': { useMounted: () => mounted },
    '@/hooks/use-scroll-spy': { useScrollSpy() {} },
  }, { Date: class extends Date {
    toLocaleString() { formatted++; return '17/10/2026, 16:21:46'; }
  } });
  const project = { id: 'project', title: 'Project', trails: [], looseItems: [] };
  const snapshot = { id: '42', version: 3, createdAt: '2026-10-17T19:21:46Z' };
  const date = () => flatten(render('PublicProjectView', { project, snapshot })
    .find(node => node.type === 'ProjectShell').props.content).find(node => node.type === 'time');
  expect(date().props.children).toBe(snapshot.createdAt);
  expect(date().props.dateTime).toBe(snapshot.createdAt);
  expect(formatted).toBe(0);
  mounted = true;
  expect(date().props.children).toBe('17/10/2026, 16:21:46');
  expect(formatted).toBe(1);
});


test('project history lists links to private previews without loading snapshots', async () => {
  let details = 0;
  const render = load('components/editor/project-history-sheet.tsx', {
    '@/components/ui/sheet': { Sheet: 'Sheet', SheetTrigger: 'Trigger' },
    '@/components/ui/button': { Button: 'Button' },
    '@/components/profile/row': { Row: 'Row' },
    'next/link': { default: 'Link' },
    'radix-ui': { Tabs: { Root: 'Tabs', List: 'List', Trigger: 'Tab', Content: 'Content' } },
    '@/lib/project-history': {
      getProjectHistory: async () => ({ versions: [{ id: 42, name: 'Milestone', type: 'MANUAL', createdAt: '2026-10-17T12:00:00Z' }], nextCursor: 42 }),
      getProjectVersion: async () => { details++; },
    },
  });
  const props = { projectId: 'project', restoreEpoch: 3, beforeSave: async () => {} };
  render('ProjectHistorySheet', props).find(node => node.type === 'Sheet').props.onOpenChange(true);
  await new Promise(resolve => setImmediate(resolve));
  const nodes = render('ProjectHistorySheet', props);
  const link = nodes.find(node => node.type === 'Link');
  expect(link.props.href).toBe('/projects/project/history/42');
  expect(link.props.target).toBe('_blank');
  expect(link.props.rel).toBe('noopener noreferrer');
  expect(nodes.some(node => node.props.children === 'Milestone')).toBe(true);
  expect(nodes.some(node => node.props.children === 'Load older versions')).toBe(true);
  expect(nodes.some(node => node.props.children === 'Restore this version')).toBe(false);
  expect(details).toBe(0);
});

test('private history preview uses saved image access and offers restore without public actions', () => {
  const render = load('components/project/public-project-view.tsx', {
    '@/components/editor/project-shell': { ProjectShell: 'Shell' },
    '@/components/editor/editor-images-provider': { EditorImagesProvider: 'Images' },
    '@/components/project/restore-project-version-button': { RestoreProjectVersionButton: 'Restore' },
    '@/components/project/lexical-read-only': { LexicalReadOnly: 'Reader' },
    '@/components/project/comments-section': { CommentsSection: 'Comments' },
    '@/components/social/share-to-followers-button': { ShareToFollowersButton: 'Share' },
    '@/hooks/use-scroll-spy': { useScrollSpy() {} },
    'next/link': { default: 'Link' },
  });
  const historyVersion = { id: 42, type: 'MANUAL', name: 'Milestone', createdAt: '2026-10-17T12:00:00Z', restoreEpoch: 3 };
  const project = { id: 'project', title: 'Saved title', trails: [], looseItems: [{ id: 'note', title: 'Saved note', content: 'Saved JSON', titleAlign: 'right' }] };
  const nodes = render('PublicProjectView', { project, historyVersion, isLoggedIn: true });
  expect(nodes.find(node => node.type === 'Images').props).toMatchObject({ publicRead: false, versionId: 42, snapshotId: undefined });
  const shell = nodes.find(node => node.type === 'Shell');
  const content = flatten(shell.props.content);
  expect(content.find(node => node.type === 'Reader').props.content).toBe('Saved JSON');
  expect(content.find(node => node.type === 'Link').props.href).toBe('/editor/project');
  expect(content.some(node => node.type === 'Comments')).toBe(false);
  const actions = flatten(shell.props.actions);
  expect(actions.find(node => node.type === 'Restore').props).toEqual({ projectId: 'project', versionId: 42, restoreEpoch: 3 });
  expect(actions.some(node => node.type === 'Share' || node.props.href === '#comments')).toBe(false);
});

test('restore requires confirmation, blocks double submission and returns to the editor', async () => {
  const calls = [], navigation = [];
  let finish;
  const render = load('components/project/restore-project-version-button.tsx', {
    '@/components/ui/button': { Button: 'Button' },
    '@/components/shared/confirm-dialog': { ConfirmDialog: 'Confirm' },
    'next/navigation': { useRouter: () => ({ push: href => navigation.push(href) }) },
    '@/lib/project-history': { restoreProjectVersion: (...args) => { calls.push(args); return new Promise(resolve => { finish = resolve; }); } },
  });
  const props = { projectId: 'project', versionId: 42, restoreEpoch: 3 };
  let nodes = render('RestoreProjectVersionButton', props);
  nodes.find(node => node.type === 'Button').props.onClick();
  expect(calls).toEqual([]);
  nodes = render('RestoreProjectVersionButton', props);
  const confirm = nodes.find(node => node.type === 'Confirm');
  expect(confirm.props.open).toBe(true);
  confirm.props.onConfirm();
  confirm.props.onConfirm();
  expect(calls).toEqual([['project', 42, 3]]);
  expect(render('RestoreProjectVersionButton', props).find(node => node.type === 'Button').props.disabled).toBe(true);
  finish({ restoreEpoch: 4 });
  await new Promise(resolve => setImmediate(resolve));
  expect(navigation).toEqual(['/editor/project']);
});

test('failed restoration displays the error and permits retry without navigation', async () => {
  const render = load('components/project/restore-project-version-button.tsx', {
    '@/components/ui/button': { Button: 'Button' },
    '@/components/shared/confirm-dialog': { ConfirmDialog: 'Confirm' },
    'next/navigation': { useRouter: () => ({ push: () => { throw new Error('Unexpected navigation'); } }) },
    '@/lib/project-history': { restoreProjectVersion: async () => { throw new Error('Project changed. Reload before restoring.'); } },
  }, { Error });
  const props = { projectId: 'project', versionId: 42, restoreEpoch: 3 };
  render('RestoreProjectVersionButton', props).find(node => node.type === 'Confirm').props.onConfirm();
  await new Promise(resolve => setImmediate(resolve));
  const nodes = render('RestoreProjectVersionButton', props);
  expect(nodes.find(node => node.props.role === 'alert').props.children).toBe('Project changed. Reload before restoring.');
  expect(nodes.find(node => node.type === 'Button').props.disabled).toBe(false);
});
