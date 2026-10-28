import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const transpile = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const content = JSON.stringify({ root: { type: 'root', children: [] } });

function setup() {
  const noteContent = {}, exports = {}, requests = [];
  runInNewContext(transpile('app/editor/note-content.ts'), { exports: noteContent, require: () => ({}) });
  runInNewContext(transpile('app/api/item/[id]/content/route.ts'), {
    exports, Response,
    require: name => ({
      'next/server': { NextResponse: Response },
      '@/lib/api': { authenticatedFetch: async (...args) => { requests.push(args); return new Response(null, { status: 204 }); } },
      '@/lib/config': { API_BASE_URL: 'http://api' },
      '@/lib/request-body': { readRequestBody: request => request.text() },
      '@/app/editor/note-content': noteContent,
    })[name],
  });
  return { requests, put: body => exports.PUT(new Request('http://localhost/api/item/1/content', {
    method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
  }), { params: Promise.resolve({ id: '1' }) }) };
}

test.each([{}, { content: null }, { content: '' }, { content }, { content, expectedContent: null },
  { content: 'not json', expectedContent: '' }])('invalid content PUT never reaches the backend: %j', async body => {
  const s = setup();
  expect((await s.put(body)).status).toBe(400);
  expect(s.requests).toHaveLength(0);
});

test('an explicit empty editor document with its conflict baseline can clear a note', async () => {
  const s = setup();
  const body = { content, expectedContent: 'previous content', extractionEpoch: 2 };
  expect((await s.put(body)).status).toBe(204);
  expect(JSON.parse(s.requests[0][1].body)).toEqual(body);
});

test('an oversized equation is rejected before forwarding the content update', async () => {
  const s = setup();
  const content = JSON.stringify({ root: { type: 'root', children: [{ type: 'equation', equation: 'x'.repeat(10001) }] } });
  expect((await s.put({ content, expectedContent: '' })).status).toBe(400);
  expect(s.requests).toHaveLength(0);
});
