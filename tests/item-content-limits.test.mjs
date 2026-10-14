import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test.each([413, 429])('a %i save failure preserves the expected content and exposes the server guidance', async status => {
  const exports = {}, bodies = [];
  let response = new Response(JSON.stringify({ message: 'Storage or note limit exceeded' }), { status });
  runInNewContext(ts.transpileModule(readFileSync('lib/item-content-client.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, Error,
    fetch: async (_url, options) => { bodies.push(JSON.parse(options.body)); return response; },
    require: () => ({ expectOk: async () => {} }),
  });
  exports.acceptExtractionEpoch('note', 0, 'saved');
  await expect(exports.saveItemContent('note', 'rejected')).rejects.toThrow('Storage or note limit exceeded');
  response = new Response(null, { status: 204 });
  await exports.saveItemContent('note', 'smaller');
  expect(bodies[1].expectedContent).toBe('saved');
});
