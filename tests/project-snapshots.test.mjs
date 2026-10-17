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


test('private version page maps saved order, transclusions and loose notes with current restore epoch', async () => {
  const requests = [];
  let detail = { version: { id: 42, name: 'Milestone', type: 'MANUAL', createdAt: '2026-10-17T12:00:00Z' }, snapshot: {
    title: 'Saved title', description: 'Saved description',
    items: [{ id: 1, title: 'Shared', content: 'Saved JSON', titleAlign: 'right' }, { id: 2, title: 'Second' }, { id: 3, title: 'Loose', unfiled: false }],
    trails: [{ id: 8, title: 'First trail', description: 'Saved trail', forkedFromId: 4, itemIds: [2, 1] }, { id: 7, title: 'Second trail', itemIds: [1] }],
  } };
  let status = 200;
  const page = load('app/projects/[projectId]/history/[versionId]/page.tsx', {
    '@/lib/project-history': { getProjectVersion: async () => detail },
    '@/lib/api': { authenticatedFetch: async (url, init) => { requests.push({ url, init }); return Response.json({ restoreEpoch: 6, title: 'Live title' }, { status }); } },
    '@/lib/config': { API_BASE_URL: 'http://backend' },
    '@/lib/http': { parseResponse: async response => { if (!response.ok) throw new Error('Server error'); return response.json(); } },
    '@/lib/profile': { getMyProfile: async () => ({ username: 'owner', imageUrl: null }) },
    '@/components/project/public-project-view': { PublicProjectView: 'View' },
    '@/components/ui/sidebar': { SidebarProvider: 'Sidebar' },
    'next/navigation': { notFound: () => { throw new Error('Not found'); } },
  });
  const props = { params: Promise.resolve({ projectId: 'project', versionId: '42' }) };
  const view = (await page.default(props)).props.children;
  expect(view.type).toBe('View');
  expect(view.props.project.title).toBe('Saved title');
  expect(view.props.project.description).toBe('Saved description');
  expect(view.props.project.ownerUsername).toBe('owner');
  const [first, second] = view.props.project.trails;
  expect(first.id).toBe('8');
  expect(first.forkedFromId).toBe('4');
  expect(first.items.map(item => item.id)).toEqual(['2', '1']);
  expect(second.items[0]).toBe(first.items[1]);
  expect(second.items[0]).toMatchObject({ content: 'Saved JSON', titleAlign: 'right' });
  expect(first.items[0]).toMatchObject({ content: '', titleAlign: 'center', type: null });
  expect(view.props.project.looseItems.map(item => item.id)).toEqual(['3']);
  expect(view.props.historyVersion).toEqual({ ...detail.version, restoreEpoch: 6 });
  expect(requests).toEqual([{ url: 'http://backend/api/project/project', init: { cache: 'no-store' } }]);
  status = 403;
  await expect(page.default(props)).rejects.toThrow('Not found');
  status = 500;
  await expect(page.default(props)).rejects.toThrow('Server error');
  status = 200;
  detail = null;
  await expect(page.default(props)).rejects.toThrow('Not found');
  await expect(page.default({ params: Promise.resolve({ projectId: 'project', versionId: 'invalid' }) })).rejects.toThrow('Not found');
});
