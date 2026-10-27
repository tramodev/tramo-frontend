import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const flatten = element => Array.isArray(element) ? element.flatMap(flatten) : element?.props ? [element, ...flatten(element.props.children)] : [];
function load(path, require, globals = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require, URLSearchParams, ...globals });
  return exports;
}
const http = load('lib/http.ts', () => ({}));
const settle = () => new Promise(resolve => setImmediate(resolve));

function projectsSetup() {
  const states = [], requests = [], starts = [], navigations = [];
  let index = 0, effectIndex = 0;
  const dependencies = [], pendingEffects = [], cleanups = [];
  const page = load('app/(app)/projects/page.tsx', name => ({
    react: {
      useState: initial => { const i = index++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
      useRef: value => ({ current: value }), useMemo: fn => fn(),
      useEffect: (fn, deps) => { const i = effectIndex++; if (!dependencies[i] || deps.some((dep, j) => dep !== dependencies[i][j])) pendingEffects.push([i, fn]); dependencies[i] = deps; },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ push: url => navigations.push(url) }) },
    '@/components/auth/current-user': { useCurrentUserId: () => '1' },
    '@/hooks/use-mounted': { useMounted: () => true },
    '@/lib/editor-draft': { beginDraft() {} },
    '@/components/ui/button': { Button: 'Button' },
    'lucide-react': { Loader2: 'Spinner' },
    '@/lib/projects-store': {
      listProjects: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
      startExampleProject: () => new Promise((resolve, reject) => starts.push({ resolve, reject })),
    },
  })[name] ?? {}, { sessionStorage: { getItem: () => 'request', setItem() {}, removeItem() {} } });
  function render() {
    index = effectIndex = 0;
    const nodes = flatten(page.default());
    for (const [i, effect] of pendingEffects.splice(0)) { cleanups[i]?.(); cleanups[i] = effect(); }
    return nodes;
  }
  return { render, requests, starts, navigations, cleanup: () => cleanups.forEach(cleanup => cleanup?.()) };
}

test('example creation uses a reserved inline status and clears it when the request fails', async () => {
  const s = projectsSetup();
  const idle = s.render().find(node => node.props.role === 'status');
  expect(idle.type).toBe('span');
  expect(flatten(idle).some(node => node.type === 'Spinner')).toBe(false);
  const start = s.render().find(node => node.type === 'button' && flatten(node).some(child => child.props.children === 'Try an example'));
  const opening = start.props.onClick();
  const nodes = s.render();
  const status = nodes.find(node => node.props.role === 'status');
  expect(status.props.className).toBe(idle.props.className);
  expect(flatten(status).some(node => node.type === 'Spinner')).toBe(true);
  expect(nodes.some(node => node.type === 'p' && node.props.role === 'status')).toBe(false);
  expect(nodes.find(node => node.type === 'button').props.disabled).toBe(true);
  s.starts[0].reject(new Error('Creation unavailable'));
  await opening;
  const clearedStatus = s.render().find(node => node.props.role === 'status');
  expect(flatten(clearedStatus).some(node => node.type === 'Spinner')).toBe(false);
  expect(s.render().some(node => node.props.role === 'alert')).toBe(true);
  expect(s.render().find(node => node.type === 'button').props.disabled).toBe(false);
});

test('start writing navigates to a draft without creating entities', async () => {
  const s = projectsSetup();
  const start = s.render().find(node => node.type === 'button' && flatten(node).some(child => child.props.children === 'Start writing'));
  await start.props.onClick();
  expect(s.navigations).toEqual(['/editor/new']);
  expect(s.starts).toHaveLength(0);
});

test('a failed projects request exits loading and can be retried', async () => {
  const s = projectsSetup(); s.render();
  s.requests[0].reject(new Error('Backend unavailable')); await settle();
  const error = s.render().find(node => node.props.role === 'alert');
  expect(error).toBeDefined();
  expect(flatten(error).find(node => node.type === 'Button').props.children).toBe('Retry');
  flatten(error).find(node => node.type === 'Button').props.onClick();
  const loading = s.render().find(node => node.props.role === 'status' && node.props['aria-label'] === 'Loading projects');
  expect(flatten(loading).some(node => node.type === 'Spinner')).toBe(true);
  expect(s.requests).toHaveLength(2);
  s.requests[1].resolve([]); await settle();
  const nodes = s.render();
  expect(nodes.some(node => node.props.role === 'alert')).toBe(false);
  expect(nodes.some(node => node.props.children === 'No projects yet. Start writing or try an example.')).toBe(true);
});

test('an unmounted projects page ignores late request results', async () => {
  const s = projectsSetup(); s.render(); s.cleanup();
  s.requests[0].reject(new Error('Late failure')); await settle();
  expect(s.render().some(node => node.props.role === 'alert')).toBe(false);
});

test('landing mockup uses an accessible static image without importing the graph runtime', () => {
  const source = readFileSync('components/landing/browser-mockup.tsx', 'utf8');
  expect(source).not.toContain('KnowledgeGraph');
  const mockup = load('components/landing/browser-mockup.tsx', name => ({
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/image': { default: 'Image' },
  })[name] ?? {});
  const images = flatten(mockup.BrowserMockup()).filter(node => node.type === 'Image');
  expect(images.map(image => image.props.src)).toEqual(['/landing-map-light.png', '/landing-map-dark.png']);
  expect(images[0].props.className).toContain('dark:hidden');
  expect(images[1].props.className).toContain('dark:block');
  expect(images.every(image => image.props.alt)).toBe(true);
});

test.each(['components/editor/graph-view.tsx', 'components/editor/connections-panel.tsx'])('%s loads the graph runtime on demand', path => {
  const source = readFileSync(path, 'utf8');
  expect(source).toContain("dynamic(() => import('@/components/editor/knowledge-graph')");
  expect(source).not.toMatch(/import\s+\{\s*KnowledgeGraph\s*\}\s+from/);
});

test('bootstrap GET preserves preferred note, trail, contents and profile', async () => {
  const requests = [];
  const dto = { id: 'project', title: 'Project', description: null, graphColors: null, visibility: 'private', tags: [],
    items: [{ id: 7, title: 'Note', titleAlign: 'left', unfiled: false, words: 2, characters: 9 }],
    trails: [{ id: 3, title: 'Trail', description: null, version: 1, forkedFromId: null, itemIds: [7] }],
    selectedItemId: 7, selectedTrailId: 3, contents: [{ id: 7, content: 'saved JSON', extractionEpoch: 2 }], username: 'owner', imageUrl: null };
  const client = load('lib/editor-bootstrap-client.ts', () => http, {
    fetch: async (...args) => { requests.push(args); return Response.json(dto); },
  });
  const result = await client.getEditorBootstrap('project', '7', '3');
  expect(requests).toEqual([['/api/projects/project/editor?noteId=7&trailId=3', { cache: 'no-store' }]]);
  expect(result.selectedItemId).toBe('7'); expect(result.selectedTrailId).toBe('3');
  expect(result.project.trails[0].itemIds).toEqual(['7']);
  expect(result.project.items['7'].textStats).toEqual({ words: 2, characters: 9 });
  expect(result.contents).toEqual(dto.contents); expect(result.profile.username).toBe('owner');
});

test('bootstrap client distinguishes missing projects from authentication failures', async () => {
  const urls = [];
  let status = 404;
  const client = load('lib/editor-bootstrap-client.ts', () => http, {
    fetch: async url => { urls.push(url); return new Response(null, { status }); },
  });
  expect(await client.getEditorBootstrap('project', '../7', 'invalid')).toBeNull();
  expect(urls[0]).toBe('/api/projects/project/editor');
  status = 401;
  await expect(client.getEditorBootstrap('project')).rejects.toThrow('401');
});

test.each([200, 401, 403])('bootstrap route uses authenticated fetch, validates parameters and disables caching (%i)', async status => {
  const requests = [];
  const route = load('app/api/projects/[projectId]/editor/route.ts', name => ({
    'next/server': { NextResponse: Response },
    '@/lib/config': { API_BASE_URL: 'https://backend' },
    '@/lib/api': { authenticatedFetch: async url => { requests.push(url); return new Response('{"result":"test"}', { status }); } },
  })[name]);
  const result = await route.GET({ nextUrl: new URL('http://frontend/api/projects/project/editor?noteId=7&trailId=../invalid&extra=ignored') }, { params: Promise.resolve({ projectId: 'project' }) });
  expect(requests).toEqual(['https://backend/api/project/project/editor?noteId=7']);
  expect(result.status).toBe(status);
  expect(result.headers.get('Cache-Control')).toBe('private, no-store');
});
