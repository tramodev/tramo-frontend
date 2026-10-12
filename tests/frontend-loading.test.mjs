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
  const states = [], requests = [];
  let index = 0, lastDeps, effect, cleanup;
  const page = load('app/(app)/projects/page.tsx', name => ({
    react: {
      useState: initial => { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
      useRef: value => ({ current: value }), useMemo: fn => fn(),
      useEffect: (fn, deps) => { if (!lastDeps || deps.some((dep, i) => dep !== lastDeps[i])) { effect = fn; lastDeps = deps; } },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ push() {} }) },
    '@/components/ui/button': { Button: 'Button' },
    '@/lib/projects-store': { listProjects: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) },
  })[name] ?? {});
  function render() {
    index = 0;
    const nodes = flatten(page.default());
    if (effect) { cleanup?.(); cleanup = effect(); effect = null; }
    return nodes;
  }
  return { render, requests, cleanup: () => cleanup?.() };
}

test('a failed projects request exits loading and can be retried', async () => {
  const s = projectsSetup(); s.render();
  s.requests[0].reject(new Error('Backend unavailable')); await settle();
  const error = s.render().find(node => node.props.role === 'alert');
  expect(error).toBeDefined();
  expect(flatten(error).find(node => node.type === 'Button').props.children).toBe('Retry');
  flatten(error).find(node => node.type === 'Button').props.onClick();
  expect(s.render().some(node => node.props.children === 'Loading...')).toBe(true);
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
