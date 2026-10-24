import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test.each(['notifications', 'export'])('%s preserves refresh outages, authentication failures and successful retries', async kind => {
  const path = kind === 'notifications' ? 'app/api/notifications/stream/route.ts' : 'app/api/projects/[projectId]/export/route.ts';
  for (const [refreshed, status, attempts] of [['unavailable', 503, 1], [false, 401, 1], [true, 200, 2]]) {
    const exports = {}, requests = [];
    let token = 'expired';
    runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText, {
      exports, Response, Headers,
      require: name => ({
        '@/lib/config': { API_BASE_URL: 'http://backend' },
        '@/lib/auth': {
          getAccessToken: async () => token,
          refreshAccessToken: async () => { if (refreshed === true) token = 'renewed'; return refreshed; },
        },
      })[name],
      fetch: async (_url, options) => {
        requests.push(options);
        return options.headers.Authorization === 'Bearer renewed'
          ? new Response('payload', { headers: { 'Content-Type': kind === 'notifications' ? 'text/event-stream' : 'application/zip' } })
          : new Response(null, { status: 401 });
      },
    });
    const request = new Request('http://frontend/api/test', { method: kind === 'notifications' ? 'GET' : 'POST' });
    const response = kind === 'notifications' ? await exports.GET(request)
      : await exports.POST(request, { params: Promise.resolve({ projectId: 'project' }) });
    expect(response.status).toBe(status);
    expect(requests).toHaveLength(attempts);
    expect(requests.every(options => options.signal === request.signal)).toBe(true);
    if (refreshed === true) expect(await response.text()).toBe('payload');
  }
});

test.each([503, 429, 499])('notification stream preserves failure status %s', async status => {
  const exports = {};
  const controller = new AbortController();
  if (status === 499) controller.abort();
  runInNewContext(ts.transpileModule(readFileSync('app/api/notifications/stream/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, Response, Headers,
    require: name => ({
      '@/lib/config': { API_BASE_URL: 'http://backend' },
      '@/lib/auth': { getAccessToken: async () => 'token' },
    })[name],
    fetch: async () => {
      if (status !== 429) throw new TypeError('connection failed');
      return new Response(null, { status: 429, headers: { 'Retry-After': '30' } });
    },
  });
  const response = await exports.GET(new Request('http://frontend/api/notifications/stream', { signal: controller.signal }));
  expect(response.status).toBe(status);
  if (status === 429) expect(response.headers.get('Retry-After')).toBe('30');
});
