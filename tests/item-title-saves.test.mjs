import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync('lib/item-title-saves.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function storage(fail = false) {
  const entries = {};
  Object.defineProperties(entries, {
    getItem: { value: key => entries[key] ?? null },
    setItem: { value: (key, value) => { if (fail) throw new Error('Storage unavailable'); entries[key] = value; } },
    removeItem: { value: key => { delete entries[key]; } },
  });
  return entries;
}
function setup({ save = async () => ({ status: 200 }), local = storage(), userId = 'user' } = {}) {
  const requests = [], exports = {};
  const client = {};
  runInNewContext(ts.transpileModule(readFileSync('lib/editor-draft-client.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: client, Error });
  const { DraftRequestError } = client;
  runInNewContext(source, {
    exports, localStorage: local, Date, Error, setTimeout, clearTimeout,
    require: name => ({
      '@/lib/editor-draft-client': { DraftRequestError },
      '@/lib/projects-store': { saveDraftMetadata: async (...args) => { requests.push(args); return save(...args); } },
    })[name],
  });
  const queue = new exports.ItemTitleSaves(userId);
  queue.start();
  return { queue, requests, local, api: exports };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('typing at 30 ms saves only the last title after 600 ms and backs up each edit immediately', async () => {
  const s = setup();
  let title = '';
  for (const letter of 'Titulo de nota largo') {
    title += letter;
    s.queue.update('project', '12', title, 0);
    expect(JSON.parse(s.local['tramo:item-title:user:project:12']).title).toBe(title);
    await jest.advanceTimersByTimeAsync(30);
  }
  expect(s.requests).toHaveLength(0);
  await jest.advanceTimersByTimeAsync(569);
  expect(s.requests).toHaveLength(0);
  await jest.advanceTimersByTimeAsync(1);
  expect(s.requests).toEqual([['project', 'item', '12', { title: 'Titulo de nota largo' }, 0]]);
  expect(s.queue.getSnapshot().status).toBe('saved');
  expect(s.api.hasPendingItemTitles('user')).toBe(false);
  s.queue.dispose();
});

test('429 waits for Retry-After and retries the latest value without replaying intermediate titles', async () => {
  let limited = true;
  const s = setup({ save: async () => limited ? { status: 429, retryAfter: 5000 } : { status: 200 } });
  s.queue.update('project', '12', 'First', 0);
  await jest.advanceTimersByTimeAsync(600);
  expect(s.queue.getSnapshot()).toMatchObject({ status: 'error', error: expect.stringContaining('kept locally') });
  s.queue.update('project', '12', 'Second', 0);
  s.queue.update('project', '12', 'Latest', 0);
  s.queue.retry();
  await jest.advanceTimersByTimeAsync(4999);
  expect(s.requests).toHaveLength(1);
  limited = false;
  await jest.advanceTimersByTimeAsync(1);
  expect(s.requests).toHaveLength(2);
  expect(s.requests[1][3].title).toBe('Latest');
  expect(s.queue.getSnapshot().error).toBe('');
  expect(s.api.hasPendingItemTitles('user')).toBe(false);
  s.queue.dispose();
});

test('5xx failures retry with increasing delays and preserve the backup until success', async () => {
  let failed = true;
  const s = setup({ save: async () => ({ status: failed ? 503 : 200 }) });
  s.queue.update('project', '12', 'Latest', 0);
  await jest.advanceTimersByTimeAsync(600);
  expect(s.api.hasPendingItemTitles('user')).toBe(true);
  await jest.advanceTimersByTimeAsync(999);
  expect(s.requests).toHaveLength(1);
  await jest.advanceTimersByTimeAsync(1);
  expect(s.requests).toHaveLength(2);
  await jest.advanceTimersByTimeAsync(1999);
  expect(s.requests).toHaveLength(2);
  failed = false;
  await jest.advanceTimersByTimeAsync(1);
  expect(s.requests).toHaveLength(3);
  expect(s.api.hasPendingItemTitles('user')).toBe(false);
  s.queue.dispose();
});

test('a server action transport failure is retried instead of disappearing silently', async () => {
  let failed = true;
  const s = setup({ save: async () => { if (failed) throw new Error('An unexpected response was received from the server.'); return { status: 200 }; } });
  s.queue.update('project', '12', 'Latest', 0);
  await jest.advanceTimersByTimeAsync(600);
  expect(s.queue.getSnapshot().status).toBe('error');
  failed = false;
  await jest.advanceTimersByTimeAsync(1000);
  expect(s.requests).toHaveLength(2);
  expect(s.queue.getSnapshot().status).toBe('saved');
  s.queue.dispose();
});

test('reload restores the latest title and its original project epoch before retrying', async () => {
  const s = setup({ save: async () => ({ status: 500 }) });
  s.queue.update('project', '12', 'Titulo de nota largo', 7);
  await jest.advanceTimersByTimeAsync(600);
  s.queue.dispose();
  const restored = setup({ local: s.local });
  expect(restored.queue.restore('project', ['12'])).toEqual({ 12: 'Titulo de nota largo' });
  await jest.advanceTimersByTimeAsync(600);
  expect(restored.requests).toEqual([['project', 'item', '12', { title: 'Titulo de nota largo' }, 7]]);
  expect(restored.api.hasPendingItemTitles('user')).toBe(false);
  restored.queue.dispose();
});

test('edits made during a request survive its completion and flush before export', async () => {
  let finish;
  const s = setup({ save: () => new Promise(resolve => { finish = resolve; }) });
  s.queue.update('project', '12', 'First', 0);
  await jest.advanceTimersByTimeAsync(600);
  s.queue.update('project', '12', 'Latest', 0);
  const flush = s.queue.flush();
  finish({ status: 200 });
  await jest.advanceTimersByTimeAsync(0);
  expect(s.requests).toHaveLength(2);
  expect(s.requests[1][3].title).toBe('Latest');
  expect(JSON.parse(s.local['tramo:item-title:user:project:12']).title).toBe('Latest');
  finish({ status: 200 });
  await flush;
  expect(s.api.hasPendingItemTitles('user')).toBe(false);
  s.queue.dispose();
});

test('flush rejects during server backoff instead of exporting an outdated title', async () => {
  const s = setup({ save: async () => ({ status: 429, retryAfter: 5000 }) });
  s.queue.update('project', '12', 'Latest', 0);
  await jest.advanceTimersByTimeAsync(600);
  await expect(s.queue.flush()).rejects.toThrow('Could not save');
  expect(s.requests).toHaveLength(1);
  s.queue.dispose();
});

test('permanent conflicts keep the backup without retrying or changing its epoch', async () => {
  const s = setup({ save: async () => ({ status: 409 }) });
  s.queue.update('project', '12', 'Latest', 2);
  await jest.advanceTimersByTimeAsync(60000);
  expect(s.requests).toHaveLength(1);
  expect(s.api.hasPendingItemTitles('user')).toBe(true);
  expect(s.queue.getSnapshot().status).toBe('error');
  s.queue.dispose();
});

test('malformed and other-account backups cannot be restored', () => {
  const s = setup();
  s.local.setItem('tramo:item-title:other:project:12', JSON.stringify({ projectId: 'project', itemId: '12', title: 'Private', restoreEpoch: 0 }));
  for (const value of [null, { title: 42 }, { projectId: 'project', itemId: '12', title: 'x', restoreEpoch: -1 }]) {
    s.local.setItem('tramo:item-title:user:project:12', JSON.stringify(value));
    expect(s.queue.restore('project', ['12'])).toEqual({});
  }
  expect(s.api.hasPendingItemTitles('other')).toBe(true);
  expect(s.requests).toHaveLength(0);
  s.queue.dispose();
});

test('unavailable storage warns on unload but still allows the title to sync', async () => {
  const s = setup({ local: storage(true) });
  s.queue.update('project', '12', 'Latest', 0);
  expect(s.queue.needsUnloadWarning()).toBe(true);
  await jest.advanceTimersByTimeAsync(600);
  expect(s.requests).toHaveLength(1);
  expect(s.queue.needsUnloadWarning()).toBe(false);
  s.queue.dispose();
});

test('signing out prevents pending writes from running under another account', async () => {
  const s = setup();
  s.queue.update('project', '12', 'Private', 0);
  s.local.removeItem('tramo:item-title:user:project:12');
  s.local.setItem('tramo:draft-owner', '');
  await jest.advanceTimersByTimeAsync(600);
  expect(s.requests).toHaveLength(0);
  expect(s.api.hasPendingItemTitles('user')).toBe(false);
  s.queue.dispose();
});

test('deleting a note discards its backup and ignores an in-flight failure', async () => {
  let fail;
  const s = setup({ save: () => new Promise((_resolve, reject) => { fail = reject; }) });
  s.queue.update('project', '12', 'Latest', 0);
  await jest.advanceTimersByTimeAsync(600);
  s.queue.discard('project', '12');
  fail(new Error('Deleted'));
  await jest.advanceTimersByTimeAsync(5000);
  expect(s.requests).toHaveLength(1);
  expect(s.queue.getSnapshot().status).toBe('saved');
  expect(s.api.hasPendingItemTitles('user')).toBe(false);
  s.queue.dispose();
});

test('malformed Retry-After cannot trigger an immediate retry loop', async () => {
  const s = setup({ save: async () => ({ status: 429, retryAfter: NaN }) });
  s.queue.update('project', '12', 'Latest', 0);
  await jest.advanceTimersByTimeAsync(600);
  await jest.advanceTimersByTimeAsync(999);
  expect(s.requests).toHaveLength(1);
  await jest.advanceTimersByTimeAsync(1);
  expect(s.requests).toHaveLength(2);
  s.queue.dispose();
});
