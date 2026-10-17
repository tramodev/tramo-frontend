import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(path, modules, globals = {}) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: name => ({ 'react/jsx-runtime': { jsx, jsxs: jsx }, ...modules })[name] ?? {},
    ...globals,
  });
  return exports;
}

test('snapshot mapping preserves historical metadata and defaults older note fields', async () => {
  const requests = [];
  const dto = { id: 42, version: 3, createdDate: '2026-10-17T12:00:00Z', content: {
    title: 'Historical title', description: 'Historical description',
    trails: [{ id: 7, title: 'Trail', description: 'Trail description', version: 2, forkedFromId: 5,
      items: [{ id: 8, title: 'Note', type: null, titleAlign: 'right', content: 'Saved JSON' }] }],
    looseItems: [{ id: 9, title: 'Legacy note', type: null, content: null }],
  } };
  const client = load('lib/project-snapshots.ts', {
    '@/lib/config': { API_BASE_URL: 'http://backend' },
    '@/lib/auth': { authHeaders: async () => ({ Authorization: 'Bearer session' }) },
  }, { fetch: async (url, options) => { requests.push({ url, options }); return Response.json(dto); } });
  const snapshot = await client.getPublicProjectSnapshot('project', '42');
  expect(requests).toEqual([{ url: 'http://backend/api/public/project/project/versions/42', options: {
    cache: 'no-store', headers: { Authorization: 'Bearer session' },
  } }]);
  expect(snapshot.title).toBe('Historical title');
  expect(snapshot.description).toBe('Historical description');
  expect(snapshot.trails[0]).toEqual({ id: '7', title: 'Trail', description: 'Trail description', version: 2, forkedFromId: '5',
    items: [{ id: '8', title: 'Note', type: null, titleAlign: 'right', content: 'Saved JSON' }] });
  expect(snapshot.looseItems[0]).toEqual({ id: '9', title: 'Legacy note', type: null, titleAlign: 'center', content: '' });
});

test('version page uses saved title and notes instead of the current publication', async () => {
  const current = { id: 'project', title: 'Current title', description: 'Current description', ownerUsername: 'author', trails: [], looseItems: [{ id: 'current' }] };
  let snapshot = { id: '42', version: 3, createdAt: '2026-10-17T12:00:00Z', title: 'Saved title', description: null,
    trails: [{ id: 'old-trail', items: [] }], looseItems: [{ id: 'saved' }] };
  const page = load('app/p/[projectId]/versions/[snapshotId]/page.tsx', {
    '@/lib/project-snapshots': { getPublicProjectSnapshot: async () => snapshot },
    '@/lib/public-project': { getPublicProject: async () => current },
    '@/lib/nav': { getHomeHref: async () => '/' },
    '@/lib/auth': { isLoggedIn: async () => false, getUsername: async () => null },
    '@/components/project/public-project-view': { PublicProjectView: 'PublicProjectView' },
    'next/navigation': { notFound: () => { throw new Error('Not found'); } },
  });
  const props = { params: Promise.resolve({ projectId: 'project', snapshotId: '42' }) };
  const view = await page.default(props);
  expect(view.type).toBe('PublicProjectView');
  expect(view.props.project).toEqual({ ...current, title: 'Saved title', description: null, trails: snapshot.trails, looseItems: snapshot.looseItems });
  expect(view.props.snapshot).toEqual({ id: '42', version: 3, createdAt: snapshot.createdAt });
  snapshot = null;
  await expect(page.default(props)).rejects.toThrow('Not found');
});
