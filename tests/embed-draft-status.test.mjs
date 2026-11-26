import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load() {
  const exports = {};
  const timers = [];
  runInNewContext(ts.transpileModule(readFileSync('app/editor/embed-draft-status.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    setTimeout: callback => timers.push(callback) - 1,
    clearTimeout: id => { timers[id] = null; },
  });
  return { ...exports, elapse: () => timers.splice(0).forEach(callback => callback?.()) };
}

test('the header tracks embed drafts that stay unsaved until they close', () => {
  const status = load();
  const first = {}, second = {};
  const changes = [];
  const unsubscribe = status.subscribeEmbedDrafts(() => changes.push(status.hasPendingEmbedDrafts()));
  status.setPendingEmbedDraft(first, true);
  status.setPendingEmbedDraft(second, true);
  status.elapse();
  status.setPendingEmbedDraft(first, false);
  status.setPendingEmbedDraft(second, false);
  unsubscribe();
  expect(changes).toEqual([true, false]);
});

test('drafts pushed before the delay never flag the header', () => {
  const status = load();
  const draft = {};
  const changes = [];
  status.subscribeEmbedDrafts(() => changes.push(status.hasPendingEmbedDrafts()));
  for (let i = 0; i < 5; i++) {
    status.setPendingEmbedDraft(draft, true);
    status.setPendingEmbedDraft(draft, false);
  }
  status.elapse();
  expect(changes).toEqual([]);
  expect(status.hasPendingEmbedDrafts()).toBe(false);
});
