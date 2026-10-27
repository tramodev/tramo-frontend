import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
const settle = () => new Promise(resolve => setImmediate(resolve));

function load(path, modules = {}, extra = '', globals = {}) {
  const exports = {}, states = [], refs = [], dependencies = [];
  let state = 0, ref = 0, effect = 0, effects = [];
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, Error, URLSearchParams, setTimeout: () => {}, ...globals,
    require: name => ({
      '@/components/auth/current-user': { useCurrentUserId: () => '1' },
      '@/hooks/use-mounted': { useMounted: () => true },
      react: {
        useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
        useState: initial => {
          const i = state++;
          if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
          return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
        },
        useRef: initial => refs[ref++] ?? (refs[ref - 1] = { current: initial }),
        useMemo: calculate => calculate(), useCallback: callback => callback,
        useEffect: (callback, deps) => {
          const i = effect++;
          if (!dependencies[i] || deps.some((dep, j) => dep !== dependencies[i][j])) effects.push(callback);
          dependencies[i] = deps;
        },
      },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      '@/components/ui/input': { Input: 'Input' },
      '@/components/ui/textarea': { Textarea: 'Textarea' },
      '@/lib/utils': { cn: (...args) => args.join(' ') },
      ...modules,
    })[name] ?? {},
  });
  return { exports, render: (component, ...args) => {
    state = ref = effect = 0;
    const result = exports[component](...args);
    const pending = effects; effects = [];
    pending.forEach(callback => callback());
    return result;
  } };
}

const validation = load('lib/project-validation.ts').exports;
const pending = load('lib/pending-saves.ts').exports;

test.each(['title', 'description'])('project %s length is validated before making a request', async field => {
  const requests = [];
  const client = load('lib/projects-store.ts', {
    '@/lib/project-validation': validation,
    './api': { authenticatedFetch: async (...args) => { requests.push(args); return new Response(null, { status: 204 }); } },
    './http': { expectOk: async response => { expect(response.ok).toBe(true); } },
    './config': { API_BASE_URL: 'http://backend' },
  }).exports;
  const save = field === 'title' ? client.renameProject : client.setProjectDescription;
  await expect(save('project', 'x'.repeat(256))).rejects.toThrow('255 characters or fewer');
  expect(requests).toHaveLength(0);
  await save('project', 'x'.repeat(255));
  expect(requests).toHaveLength(1);
});

test('an invalid project rename never enters the snapshot save barrier', async () => {
  const hook = load('app/editor/[projectId]/hooks/useProjectEditorState.ts', {
    '@/lib/project-validation': validation,
    '@/lib/pending-saves': pending,
    '@/lib/item-title-saves': load('lib/item-title-saves.ts').exports,
    'next/navigation': { useRouter: () => ({}) },
    '@/app/editor/[projectId]/hooks/useAutoSave': { useAutoSave: () => ({}) },
  });
  const project = hook.exports.useProjectEditorState('project', false);
  expect(() => project.handleRenameProject('x'.repeat(256))).toThrow('255 characters or fewer');
  await expect(project.flushProjectChanges()).resolves.toBeUndefined();
});

test.each(['Grid view', 'List view'])('project rename waits for the menu to close in %s and reports save failures', async mode => {
  const page = load('app/(app)/projects/page.tsx', {
    'next/navigation': { useRouter: () => ({}) },
    '@/lib/project-validation': validation,
    '@/components/ui/dropdown-menu': { DropdownMenuItem: 'MenuItem', DropdownMenuContent: 'Menu' },
    '@/lib/projects-store': {
      listProjects: async () => [{ id: 'project', title: 'Original', updatedAt: '2026-10-21', storageBytes: 0 }],
      renameProject: async () => { throw new Error('Rename rejected'); },
    },
    '@/lib/format-bytes': { formatBytes: () => '0 B' },
  });
  const render = () => flatten(page.render('default'));
  render(); await settle();
  render().find(node => node.props['aria-label'] === mode).props.onClick();
  render().find(node => node.type === 'MenuItem' && node.props.children.includes('Rename')).props.onSelect();
  expect(render().some(node => node.type === 'Input')).toBe(false);
  let prevented = false;
  render().find(node => node.type === 'Menu' && node.props.onCloseAutoFocus).props.onCloseAutoFocus({ preventDefault: () => { prevented = true; } });
  expect(prevented).toBe(true);
  const input = render().find(node => node.type === 'Input');
  expect(input.props.value).toBe('Original');
  input.props.onChange({ target: { value: 'Renamed' } });
  await render().find(node => node.type === 'Input').props.onBlur();
  expect(render().find(node => node.props.role === 'alert').props.children).toBe('Rename rejected');
  expect(render().find(node => node.type === 'Input').props.value).toBe('Renamed');
});

test('the editor keeps a rejected project title editable and blocks duplicate submissions', async () => {
  let reject;
  const requests = [];
  const header = load('app/editor/[projectId]/components/EditorHeader.tsx', {
    '@/lib/project-validation': validation,
  });
  const props = { projectTitle: 'Original', saveStatus: 'saved', saveError: '', onRenameProject: title => {
    requests.push(title);
    return new Promise((_resolve, fail) => { reject = fail; });
  } };
  const render = () => flatten(header.render('EditorTitleSlot', props));
  render().find(node => node.props['data-tour'] === 'editor-title').props.onDoubleClick();
  render().find(node => node.type === 'Input').props.onChange({ target: { value: 'Renamed' } });
  const input = render().find(node => node.type === 'Input');
  const saving = input.props.onBlur();
  await input.props.onBlur();
  expect(requests).toEqual(['Renamed']);
  reject(new Error('Could not save title'));
  await saving;
  expect(render().find(node => node.props.role === 'alert').props.children).toBe('Could not save title');
  expect(render().find(node => node.type === 'Input').props.value).toBe('Renamed');
  expect(render().find(node => node.type === 'Input').props.disabled).toBe(false);
});

function shareSetup(getProject, saveDescription = async () => {}) {
  const published = [], savedTags = [], copied = [];
  const page = load('app/projects/[projectId]/share/page.tsx', {
    'next/navigation': { useParams: () => ({ projectId: 'project' }), useRouter: () => ({}) },
    '@/lib/projects-store': {
      getProject, setProjectDescription: saveDescription,
      setProjectVisibility: async () => ({ error: null }),
      setProjectTags: async (...args) => { savedTags.push(args); },
      publishProject: async (...args) => { published.push(args); return { error: null }; },
    },
    '@/lib/profile': { getMyProfile: async () => null },
    '@/lib/project-validation': validation,
    '@/lib/pending-saves': pending,
    '@/lib/item-title-saves': load('lib/item-title-saves.ts').exports,
    '@/lib/utils': { cn: (...args) => args.join(' ') },
  }, '', { window: { location: { origin: 'http://localhost:3000' } }, navigator: { clipboard: { writeText: async text => { copied.push(text); } } } });
  return { render: () => flatten(page.render('default')), published, savedTags, copied };
}

test.each([null, new Error('Unavailable')])('share load failures render a visible state and a way back', async result => {
  const s = shareSetup(async () => { if (result instanceof Error) throw result; return result; });
  expect(s.render().some(node => node.props.role === 'status')).toBe(true);
  await settle();
  const nodes = s.render();
  expect(nodes.some(node => node.props.role === 'alert')).toBe(true);
  expect(nodes.some(node => node.props.href === '/projects')).toBe(true);
});

const project = { id: 'project', title: 'Project', description: '', tags: '', visibility: 'private', restoreEpoch: 0 };
const confirmButton = nodes => nodes.find(node => node.type === 'button' && node.props.children === 'Publish');

test('a failed description save is reported and prevents publishing stale metadata', async () => {
  const s = shareSetup(async () => project, async () => { throw new Error('Could not save description'); });
  s.render(); await settle();
  let nodes = s.render();
  nodes.find(node => node.props.id === 'publish-description').props.onChange({ target: { value: 'Description' } });
  nodes.find(node => node.props.type === 'button' && node.props.className?.includes('text-left')).props.onClick();
  nodes = s.render();
  const visibility = nodes.filter(node => node.props.type === 'button' && node.props.className?.includes('text-left'));
  visibility[2].props.onClick();
  await confirmButton(s.render()).props.onClick();
  expect(s.published).toHaveLength(0);
  expect(s.render().find(node => node.props.role === 'alert').props.children).toBe('Could not save description');
});

test('publishing waits for a description save started on blur', async () => {
  const writes = [];
  const s = shareSetup(async () => project, () => new Promise(resolve => writes.push(resolve)));
  s.render(); await settle();
  s.render().find(node => node.props.id === 'publish-description').props.onChange({ target: { value: 'Description' } });
  s.render().filter(node => node.props.type === 'button' && node.props.className?.includes('text-left'))[2].props.onClick();
  s.render().find(node => node.props.id === 'publish-description').props.onBlur();
  const publishing = confirmButton(s.render()).props.onClick();
  await settle();
  expect(s.published).toHaveLength(0);
  writes[0](); await settle();
  if (writes[1]) writes[1]();
  await publishing;
  expect(s.published).toEqual([['project', 0]]);
});

test.each([['', '', '', 'Complete all password fields'], ['current', 'Abcdefgh1!x', 'Abcdefgh1!x', 'Password must be at least 12 characters']])('password validation reports empty and short values', async (current, password, confirmation, error) => {
  const requests = [];
  const view = load('components/profile/settings-view.tsx', {
    'next/navigation': { useRouter: () => ({}) },
    '@/lib/password-strength': { getPasswordStrength: () => ({}) },
    '@/lib/account': { changePassword: async (...args) => requests.push(args) },
  }, '\nexport { ChangePasswordSection };');
  let nodes = flatten(view.render('ChangePasswordSection'));
  for (const [id, value] of [['current-password', current], ['new-password', password], ['confirm-new-password', confirmation]]) {
    nodes.find(node => node.props.id === id).props.onChange({ target: { value } });
  }
  nodes = flatten(view.render('ChangePasswordSection'));
  const form = nodes.find(node => node.type === 'form');
  expect(form.props.noValidate).toBe(true);
  await form.props.onSubmit({ preventDefault() {} });
  expect(requests).toHaveLength(0);
  expect(flatten(view.render('ChangePasswordSection')).find(node => node.props.role === 'alert').props.children).toBe(error);
});

test('mismatched passwords show one inline error and never submit', async () => {
  const requests = [];
  const view = load('components/profile/settings-view.tsx', {
    'next/navigation': { useRouter: () => ({}) },
    '@/lib/password-strength': { getPasswordStrength: () => ({}) },
    '@/lib/account': { changePassword: async (...args) => requests.push(args) },
    '@/components/ui/field': { FieldError: 'FieldError' },
  }, '\nexport { ChangePasswordSection };');
  const render = () => flatten(view.render('ChangePasswordSection'));
  for (const [id, value] of [['current-password', 'current'], ['new-password', 'Abcdefghijk1!'], ['confirm-new-password', 'Different123!']]) {
    render().find(node => node.props.id === id).props.onChange({ target: { value } });
  }
  await render().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  expect(requests).toHaveLength(0);
  expect(render().filter(node => node.props.children === 'Passwords do not match')).toHaveLength(1);
  expect(render().some(node => node.props.role === 'alert')).toBe(false);
  render().find(node => node.props.id === 'confirm-new-password').props.onChange({ target: { value: 'Abcdefghijk1!' } });
  expect(render().filter(node => node.props.children === 'Passwords do not match')).toHaveLength(0);
});


test('saving Share exposes a working public link and copy button next to Save', async () => {
  const s = shareSetup(async () => project);
  s.render(); await settle();
  s.render().filter(node => node.props.type === 'button' && node.props.className?.includes('text-left'))[1].props.onClick();
  expect(s.render().some(node => node.props['aria-label'] === 'Copy public link')).toBe(false);
  await s.render().find(node => node.type === 'button' && node.props.children === 'Save').props.onClick();
  const sticky = s.render().find(node => node.props.className?.includes('sticky bottom-0'));
  const children = flatten(sticky);
  expect(children.some(node => node.type === 'a' && node.props.href === 'http://localhost:3000/p/project')).toBe(true);
  await children.find(node => node.props['aria-label'] === 'Copy public link').props.onClick();
  expect(s.copied).toEqual(['http://localhost:3000/p/project']);
});


test('closing the map waits for its trigger to be rendered before restoring focus', () => {
  const frames = [], focused = [];
  let closed = false;
  const graph = load('components/editor/graph-view.tsx', {
    'next/dynamic': { default: () => 'KnowledgeGraph' },
  }, '', {
    requestAnimationFrame: callback => frames.push(callback),
    document: { querySelector: selector => closed && selector === '[data-map-trigger]' ? { focus: () => focused.push('map-trigger') } : null },
  });
  const region = flatten(graph.render('GraphView', { onClose: () => { closed = true; } })).find(node => node.props.role === 'region');
  region.props.onKeyDown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  expect(closed).toBe(true);
  expect(focused).toEqual([]);
  frames.shift()();
  expect(focused).toEqual(['map-trigger']);
});

test.each([true, false])('the skip link focuses the editor when available, otherwise the main landmark (%s)', editor => {
  const focused = [];
  const content = { hasAttribute: () => false, focus: () => focused.push('editor'), scrollIntoView() {} };
  const main = { querySelector: () => editor ? content : null, hasAttribute: () => false, focus: () => focused.push('main'), scrollIntoView() {} };
  const skip = load('components/layout/skip-link.tsx', {}, '', { document: { querySelector: () => main } });
  let prevented = false;
  skip.render('SkipLink').props.onClick({ preventDefault: () => { prevented = true; } });
  expect(prevented).toBe(true);
  expect(focused).toEqual([editor ? 'editor' : 'main']);
});

test('dismissing the editor hint persists for the same user across mounts', () => {
  const storage = new Map();
  const hint = load('components/editor/task-hint.tsx', {}, '', {
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    Event: class { constructor(type) { this.type = type; } },
    window: { dispatchEvent() {} },
  });
  const props = { id: 'alice:write', children: 'Write a note' };
  const first = flatten(hint.render('TaskHint', props));
  first.find(node => node.props['aria-label'] === 'Dismiss tip').props.onClick();
  expect(hint.render('TaskHint', props)).toBeNull();
  expect(hint.render('TaskHint', { ...props, id: 'bob:write' })).not.toBeNull();
});


test('My Projects keeps view and sorting choices across mounts', () => {
  const storage = new Map();
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const createPage = () => load('app/(app)/projects/page.tsx', {
    'next/navigation': { useRouter: () => ({}) },
    '@/components/ui/dropdown-menu': { DropdownMenuItem: 'MenuItem' },
    '@/lib/projects-store': { listProjects: async () => [] },
  }, '', { localStorage });
  let page = createPage();
  const render = () => flatten(page.render('default'));
  render().find(node => node.props['aria-label'] === 'List view').props.onClick();
  render().find(node => node.type === 'MenuItem' && node.props.children === 'Title').props.onSelect();
  render();
  page = createPage();
  expect(render().find(node => node.props['aria-label'] === 'List view').props['aria-pressed']).toBe(true);
  expect(render().some(node => node.props.children === 'Title' && node.type !== 'MenuItem')).toBe(true);
  render().find(node => node.props['aria-label'] === 'Grid view').props.onClick();
  render().find(node => node.type === 'MenuItem' && node.props.children === 'Last modified').props.onSelect();
  render();
  page = createPage();
  expect(render().find(node => node.props['aria-label'] === 'Grid view').props['aria-pressed']).toBe(true);
  expect(render().some(node => node.props.children === 'Last modified' && node.type !== 'MenuItem')).toBe(true);
});

test.each([false, true])('My Projects falls back safely when storage is invalid or unavailable (%s)', blocked => {
  const page = load('app/(app)/projects/page.tsx', {
    'next/navigation': { useRouter: () => ({}) },
    '@/lib/projects-store': { listProjects: async () => [] },
  }, '', { localStorage: {
    getItem() { if (blocked) throw new Error('Blocked'); return 'invalid'; },
    setItem() { if (blocked) throw new Error('Blocked'); },
  } });
  let nodes = flatten(page.render('default'));
  expect(nodes.find(node => node.props['aria-label'] === 'Grid view').props['aria-pressed']).toBe(true);
  nodes.find(node => node.props['aria-label'] === 'List view').props.onClick();
  nodes = flatten(page.render('default'));
  expect(nodes.find(node => node.props['aria-label'] === 'List view').props['aria-pressed']).toBe(true);
});


test('Escape closes compact formatting and restores its trigger without closing nested menus', () => {
  const frames = [], focused = [];
  const workspace = load('app/editor/editor-workspace.tsx', {
    '@/app/editor/editor-utils': { countProjectTextStats: () => null },
    '@/app/editor/[projectId]/hooks/useProjectEditorState': { useProjectEditorState: () => ({
      loaded: true, view: 'write', items: {}, selectedItem: { id: 'note' }, projectTitle: 'Test',
    }) },
  }, '', {
    window: { addEventListener() {}, removeEventListener() {} }, document: {},
    requestAnimationFrame: callback => frames.push(callback),
  });
  const render = () => workspace.render('ProjectEditor', { routeProjectId: 'project', user: { userId: '1' } });
  let root = render();
  root.props.ref.current = { dataset: { shortViewport: 'true' } };
  const trigger = () => flatten(root.props.children.props.actions).find(node => node.props['aria-controls'] === 'editor-formatting-toolbar');
  trigger().props.ref.current = { focus: () => focused.push('formatting') };
  trigger().props.onClick();
  root = render();
  expect(trigger().props['aria-expanded']).toBe(true);
  const event = { key: 'Escape', target: { closest: () => ({}) }, preventDefault() {}, stopPropagation() {} };
  root.props.onKeyDown(event);
  root = render();
  expect(trigger().props['aria-expanded']).toBe(true);
  root.props.ref.current.dataset.shortViewport = 'false';
  root.props.onKeyDown({ ...event, target: { closest: () => null } });
  root = render();
  expect(trigger().props['aria-expanded']).toBe(true);
  root.props.ref.current.dataset.shortViewport = 'true';
  root.props.onKeyDown({ ...event, target: { closest: () => null } });
  root = render();
  expect(trigger().props['aria-expanded']).toBe(false);
  expect(focused).toEqual([]);
  frames.forEach(callback => callback());
  expect(focused).toEqual(['formatting']);
});
