import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const jwt = exp => `h.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.s`;

function setup(responses) {
  const exports = {}, calls = [];
  runInNewContext(ts.transpileModule(readFileSync('lib/collab-client.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, Error, Date, JSON, Number, Promise, Map, atob,
    fetch: async (_url, options) => { calls.push(JSON.parse(options.body)); return responses.shift()(); },
    require: () => ({ COLLAB_URL: '' }),
  });
  return { api: exports, calls };
}

test('a fresh token is reused across reconnects and concurrent requests share one fetch', async () => {
  const token = jwt(Math.floor(Date.now() / 1000) + 120);
  const s = setup([() => Response.json({ token })]);
  const [first, second] = await Promise.all([s.api.fetchCollabToken('7'), s.api.fetchCollabToken('7')]);
  expect([first, second, await s.api.fetchCollabToken('7')]).toEqual([token, token, token]);
  expect(s.calls).toHaveLength(1);
  s.api.forgetCollabToken('7');
  await expect(s.api.fetchCollabToken('7')).rejects.toThrow();
  expect(s.calls).toHaveLength(2);
});

test('a rate limited token request cools down instead of retrying the server', async () => {
  const s = setup([() => Response.json({ message: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '30' } })]);
  await expect(s.api.fetchCollabToken('7')).rejects.toThrow('Too many requests');
  await expect(s.api.fetchCollabToken('8')).rejects.toThrow('Retrying shortly');
  expect(s.calls).toHaveLength(1);
});

test.each([401, 403, 404])('a %i marks the failure as lost access', async status => {
  const s = setup([() => Response.json({ message: 'No access' }, { status })]);
  await expect(s.api.fetchCollabToken('7')).rejects.toMatchObject({ name: s.api.COLLAB_ACCESS_DENIED });
});
