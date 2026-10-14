import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync('lib/request-body.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, Response, TextDecoder });

test('known oversized requests are rejected without reading and cancel the body', async () => {
  let cancelled = false;
  const response = await exports.readRequestBody({
    headers: new Headers({ 'content-length': String(4 * 1024 * 1024 + 1) }),
    body: { cancel: async () => { cancelled = true; }, getReader: () => { throw new Error('must not read'); } },
  });
  expect(response.status).toBe(413);
  expect(cancelled).toBe(true);
});

test('chunked requests cannot bypass the byte limit and stop reading immediately', async () => {
  let reads = 0, cancelled = false;
  const response = await exports.readRequestBody({
    headers: new Headers(),
    body: { getReader: () => ({
      read: async () => { reads++; return { done: false, value: new Uint8Array(1024 * 1024) }; },
      cancel: async () => { cancelled = true; }, releaseLock: () => {},
    }) },
  });
  expect(response.status).toBe(413);
  expect(reads).toBe(5);
  expect(cancelled).toBe(true);
});

test('exactly four MiB are accepted and UTF-8 survives split chunks', async () => {
  const text = 'é'.repeat(2 * 1024 * 1024);
  const bytes = new TextEncoder().encode(text);
  const request = new Request('http://localhost/api/item/1/content', {
    method: 'PUT', duplex: 'half', body: new ReadableStream({ start(controller) {
      controller.enqueue(bytes.slice(0, 1));
      controller.enqueue(bytes.slice(1));
      controller.close();
    } }),
  });
  expect(await exports.readRequestBody(request)).toBe(text);
});
