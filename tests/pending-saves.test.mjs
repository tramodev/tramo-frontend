import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('lib/pending-saves.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const settle = () => new Promise(resolve => setImmediate(resolve));

test('export waits for all metadata writes, serializes the same field and includes newly queued saves', async () => {
  const pending = exports.createPendingSaves(), calls = [];
  let titleDone, annotationDone;
  const first = pending.track('title', () => new Promise(resolve => { calls.push('first'); titleDone = resolve; }), true);
  const second = pending.track('title', async () => { calls.push('latest'); }, true);
  pending.track('annotation', () => new Promise(resolve => { annotationDone = resolve; }), true);
  let exported = false;
  const barrier = pending.flush().then(() => { exported = true; });
  await settle(); expect(exported).toBe(false); expect(calls).toEqual(['first']);
  titleDone(); await first; await second; await settle();
  expect(calls).toEqual(['first', 'latest']); expect(exported).toBe(false);
  annotationDone(); await barrier; expect(exported).toBe(true);
});

test('export rejects failed saves and safely retries idempotent metadata actions on another attempt', async () => {
  const pending = exports.createPendingSaves();
  let fail = true;
  const save = () => fail ? Promise.reject(new Error('offline')) : Promise.resolve();
  const first = pending.track('order', save, true);
  const barrier = pending.flush();
  await expect(first).rejects.toThrow('offline'); await expect(barrier).rejects.toThrow('offline');
  await expect(pending.flush()).rejects.toThrow('offline');
  fail = false; await pending.flush();
});

test('failed creations are not retried automatically and cannot create duplicate notes', async () => {
  const pending = exports.createPendingSaves(); let requests = 0;
  await expect(pending.track('create', async () => { requests++; throw new Error('lost response'); })).rejects.toThrow();
  await expect(pending.flush()).rejects.toThrow('Retry the failed action');
  expect(requests).toBe(1);
});
