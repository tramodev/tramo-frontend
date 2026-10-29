import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('the header can track unsaved embed drafts until they close', () => {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/embed-draft-status.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports });
  const first = {}, second = {};
  const changes = [];
  const unsubscribe = exports.subscribeEmbedDrafts(() => changes.push(exports.hasPendingEmbedDrafts()));
  exports.setPendingEmbedDraft(first, true);
  exports.setPendingEmbedDraft(second, true);
  exports.setPendingEmbedDraft(first, false);
  exports.setPendingEmbedDraft(second, false);
  unsubscribe();
  expect(changes).toEqual([true, false]);
});
