import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup() {
  const states = [], refs = [], requests = [], downloads = [];
  let stateIndex = 0, refIndex = 0;
  const configuration = { beforeExport: async () => {}, response: { ok: true, headers: { get: () => 'application/zip' }, blob: async () => ({ size: 10 }) } };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('components/editor/export-project-button.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, Error,
    require: name => ({
      react: {
        useRef: value => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
        useState: value => { const i = stateIndex++; if (!(i in states)) states[i] = value; return [states[i], next => { states[i] = next; }]; },
      },
      'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
      'lucide-react': { Download: 'Download', Loader2: 'Loader2' },
      '@/lib/projects-store': { getProject: async () => ({ items: {} }) },
      '@/lib/project-embed-errors': { projectEmbedErrors: async () => [] },
      '@/components/ui/button': { Button: 'Button' },
      '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogContent', 'DialogDescription', 'DialogHeader', 'DialogTitle'].map(name => [name, name])),
    })[name],
    fetch: async (...args) => { requests.push(args); return configuration.response; },
    URL: { createObjectURL: () => 'blob:zip', revokeObjectURL: () => {} }, setTimeout: () => {},
    document: { body: { appendChild: () => {} }, createElement: () => { const anchor = { click: () => downloads.push(anchor.download), remove: () => {} }; return anchor; } },
  });
  function flatten(element) {
    if (Array.isArray(element)) return element.flatMap(flatten);
    if (!element?.props) return [];
    return [element, ...flatten(element.props.children)];
  }
  function render() {
    stateIndex = refIndex = 0;
    return flatten(exports.ExportProjectButton({ projectId: 'opaque', beforeExport: () => configuration.beforeExport() }));
  }
  return { render, configuration, requests, downloads };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('export waits for pending saves, prevents duplicate requests and downloads the ZIP once', async () => {
  const s = setup(); let saved;
  s.configuration.beforeExport = () => new Promise(resolve => { saved = resolve; });
  const button = s.render().find(node => node.type === 'Button');
  button.props.onClick(); button.props.onClick(); await settle();
  expect(s.requests).toHaveLength(0);
  expect(s.render().find(node => node.type === 'Button').props.disabled).toBe(true);
  saved(); await settle();
  expect(s.requests).toHaveLength(1);
  expect(s.requests[0][0]).toBe('/api/projects/opaque/export?embedErrors=0');
  expect(s.downloads).toEqual(['tramo-project-opaque.zip']);
});

test('failed save prevents export and presents a recoverable error', async () => {
  const s = setup(); s.configuration.beforeExport = async () => { throw new Error('Image upload is unfinished'); };
  s.render().find(node => node.type === 'Button').props.onClick(); await settle();
  expect(s.requests).toHaveLength(0); expect(s.downloads).toHaveLength(0);
  expect(s.render().find(node => node.props.role === 'alert').props.children).toBe('Image upload is unfinished');
  s.configuration.beforeExport = async () => {};
  s.render().find(node => node.type === 'Button' && node.props.children === 'Try again').props.onClick(); await settle();
  expect(s.downloads).toHaveLength(1);
});

test('missing storage resource errors are shown instead of downloading an incomplete export', async () => {
  const s = setup(); s.configuration.response = { ok: false, json: async () => ({ message: 'Cannot export required resource: image-id' }) };
  s.render().find(node => node.type === 'Button').props.onClick(); await settle();
  expect(s.downloads).toHaveLength(0);
  expect(s.render().find(node => node.props.role === 'alert').props.children).toContain('image-id');
});

function exportRoute() {
  const exports = {}, requests = [];
  runInNewContext(ts.transpileModule(readFileSync('app/api/projects/[projectId]/export/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URL, Response,
    require: name => ({
      '@/lib/backend-fetch': { backendFetch: async (url, options) => { requests.push({ url, options }); return new Response('archive', { headers: { 'Content-Type': 'application/zip' } }); } },
      '@/lib/config': { API_BASE_URL: 'http://backend' },
      '@/lib/auth': { getAccessToken: async () => 'private-token', refreshAccessToken: async () => false },
    })[name],
  });
  return { ...exports, requests };
}

test.each(['-1', '200001', '1.5', 'Infinity', 'invalid'])('export rejects invalid embed count %s before contacting the API', async count => {
  const route = exportRoute();
  const response = await route.POST(new Request(`http://localhost/api/projects/project/export?embedErrors=${count}`, { method: 'POST' }), { params: Promise.resolve({ projectId: 'project' }) });
  expect(response.status).toBe(400);
  expect(route.requests).toHaveLength(0);
});

test('export forwards only the advisory count and keeps the access token in its header', async () => {
  const route = exportRoute();
  const response = await route.POST(new Request('http://localhost/api/projects/project/export?embedErrors=2', { method: 'POST' }), { params: Promise.resolve({ projectId: 'project' }) });
  expect(response.status).toBe(200);
  expect(route.requests[0].url).toBe('http://backend/api/project/project/export?embedErrors=2');
  expect(route.requests[0].options.headers.Authorization).toBe('Bearer private-token');
});
