import { expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';

const content = text => JSON.stringify({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] } });
const settle = () => new Promise(resolve => setImmediate(resolve));
const result = { projectId: 'project', trailId: 11, itemId: 12, restoreEpoch: 0, projectTitle: 'Untitled project', trailTitle: 'My first trail', itemTitle: 'Untitled note' };
function storage(fail = false) {
  const entries = {};
  Object.defineProperties(entries, {
    getItem: { value: key => entries[key] ?? null },
    setItem: { value: (key, value) => { if (fail) throw new Error('Storage unavailable'); entries[key] = value; } },
    removeItem: { value: key => { delete entries[key]; } },
  });
  return entries;
}
function setup({ commit, save, metadata, storageFails = false } = {}) {
  const localStorage = storage(storageFails), sessionStorage = storage();
  const requests = [], saves = [], titles = [];
  let seed;
  class DraftRequestError extends Error {
    constructor(status, retryAfter = 0) { super(`Request failed with status ${status}`); this.status = status; this.retryAfter = retryAfter; }
    get retryable() { return this.status === 429 || this.status >= 500; }
  }
  const exports = {};
  const jsx = { exports, Error, TypeError, Date, setTimeout, clearTimeout, crypto: { randomUUID }, localStorage, sessionStorage };
  runInNewContext(ts.transpileModule(readFileSync('lib/editor-draft.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { ...jsx, require: name => ({
    '@/app/editor/plugins/embed': { validateEmbed: (provider, id) => provider === 'youtube' && /^[\w-]{11}$/.test(id ?? '') },
    '@/lib/editor-draft-client': { DraftRequestError, commitEditorDraft: async (id, snapshot) => {
      requests.push({ id, snapshot: JSON.parse(JSON.stringify(snapshot)) });
      return commit ? commit(id, snapshot) : result;
    } },
    '@/lib/item-content-client': {
      acceptExtractionEpoch: (...args) => { seed = args; },
      saveItemContent: async (...args) => { saves.push(args); if (save) await save(...args); },
      getItemContent: async () => 'other content',
    },
    '@/lib/projects-store': { saveDraftMetadata: async (projectId, entity, id, fields, epoch) => {
      titles.push([entity, id, fields, epoch, projectId]);
      return metadata ? metadata() : { status: 200 };
    } },
  })[name] ?? {} });
  return { api: exports, localStorage, sessionStorage, requests, saves, titles, DraftRequestError, get seed() { return seed; } };
}

test('blank editor states, spaces and formatting do not create or persist a project', async () => {
  const s = setup(), draft = s.api.newDraft('user');
  draft.start();
  draft.update({ item: { title: '', titleAlign: 'left', content: content(' \n\t ') } });
  await settle();
  expect(s.requests).toHaveLength(0);
  expect(Object.keys(s.localStorage)).toHaveLength(0);
});

test.each(['project', 'trail', 'item'])('a real %s title commits without waiting for blur', async entity => {
  const s = setup(), draft = s.api.newDraft('user');
  draft.update({ [entity]: { ...draft.backup.latest[entity], title: 'A title' } });
  await draft.commit();
  expect(s.requests).toHaveLength(1);
});

test.each([
  { type: 'equation', equation: 'x^2' },
  { type: 'music', abc: 'X:1\nK:C\nC' },
  { type: 'embed', provider: 'youtube', id: 'dQw4w9WgXcQ' },
])('valid non-text content commits: $type', async node => {
  const s = setup(), draft = s.api.newDraft('user');
  draft.update({ item: { title: '', titleAlign: 'left', content: JSON.stringify({ root: { children: [node] } }) } });
  await draft.commit();
  expect(s.requests).toHaveLength(1);
});

test('one commit preserves the latest edits and keeps its backup until synchronization completes', async () => {
  let confirm, finishSave;
  const s = setup({ commit: () => new Promise(resolve => { confirm = resolve; }), save: () => new Promise(resolve => { finishSave = resolve; }) });
  const draft = s.api.newDraft('user');
  draft.update({ item: { title: '', titleAlign: 'left', content: content('a') } });
  const opening = draft.commit();
  draft.update({ item: { title: 'Latest title', titleAlign: 'left', content: content('abc') } });
  expect(draft.commit()).toBe(opening);
  expect(s.requests).toHaveLength(1);
  expect(s.requests[0].snapshot.item.content).toBe(content('a'));
  confirm(result); await settle();
  expect(s.saves[0][0]).toBe('12');
  expect(s.saves[0][1]).toBe(content('abc'));
  expect(s.seed[2]).toBe(content('a'));
  expect(Object.keys(s.localStorage)).toHaveLength(1);
  expect(s.titles[0]).toEqual(['item', '12', { title: 'Latest title' }, 0, 'project']);
  finishSave(); await opening;
  expect(Object.keys(s.localStorage)).toHaveLength(0);
  expect(draft.getSnapshot().status).toBe('saved');
});

test('reload restores the same tab and request while a fresh tab gets another UUID', async () => {
  const s = setup({ commit: async () => { throw new TypeError('offline'); } });
  const draft = s.api.newDraft('user');
  draft.update({ item: { title: '', titleAlign: 'left', content: content('kept') } });
  await draft.commit().catch(() => {}); draft.dispose();
  const restored = s.api.newDraft('user');
  expect(restored.backup.clientRequestId).toBe(draft.backup.clientRequestId);
  expect(restored.backup.latest.item.content).toBe(content('kept'));
  s.api.beginDraft('user');
  expect(s.api.newDraft('user').backup.clientRequestId).not.toBe(draft.backup.clientRequestId);
  expect(s.api.listDrafts('other-user')).toHaveLength(0);
  s.api.recoverDraft('user', draft.backup.clientRequestId);
  expect(s.api.newDraft('user').backup.clientRequestId).toBe(draft.backup.clientRequestId);
});

test('transient retries reuse the frozen snapshot and stop on disposal', async () => {
  jest.useFakeTimers();
  try {
    const s = setup({ commit: async () => { throw new TypeError('offline'); } });
    const draft = s.api.newDraft('user');
    draft.update({ project: { title: 'first' } });
    await draft.commit().catch(() => {});
    draft.update({ project: { title: 'latest' } });
    await jest.advanceTimersByTimeAsync(1000);
    expect(s.requests).toHaveLength(2);
    expect(s.requests[1]).toEqual(s.requests[0]);
    draft.dispose();
    await jest.advanceTimersByTimeAsync(60000);
    expect(s.requests).toHaveLength(2);
  } finally { jest.useRealTimers(); }
});

test('expired backups are removed', async () => {
  const s = setup({ commit: async () => { throw new TypeError('offline'); } });
  const draft = s.api.newDraft('user');
  draft.update({ project: { title: 'saved locally' } });
  await draft.commit().catch(() => {}); draft.dispose();
  const key = s.api.draftStorageKey('user', draft.backup.clientRequestId);
  const backup = JSON.parse(s.localStorage.getItem(key));
  backup.updatedAt = Date.now() - 8 * 86400000;
  s.localStorage.setItem(key, JSON.stringify(backup));
  expect(s.api.listDrafts('user')).toHaveLength(0);
  expect(s.localStorage.getItem(key)).toBe(null);
});

test('backup restoration validates ownership and the editor-state shape', async () => {
  const s = setup({ commit: async () => { throw new TypeError('offline'); } });
  const draft = s.api.newDraft('user');
  draft.update({ project: { title: 'kept' } });
  await draft.commit().catch(() => {}); draft.dispose();
  const key = s.api.draftStorageKey('user', draft.backup.clientRequestId);
  const backup = JSON.parse(s.localStorage.getItem(key));
  backup.userId = 'another-user';
  s.localStorage.setItem(key, JSON.stringify(backup));
  expect(s.api.readDraft('user', draft.backup.clientRequestId)).toBe(null);
  backup.userId = 'user';
  backup.latest.item.content = '{"unexpected":true}';
  s.localStorage.setItem(key, JSON.stringify(backup));
  expect(s.api.readDraft('user', draft.backup.clientRequestId)).toBe(null);
});

test('loading silently removes empty image-only backups without restoring another draft', async () => {
  const s = setup({ commit: async () => { throw new TypeError('offline'); } });
  const draft = s.api.newDraft('user');
  await draft.commit(true).catch(() => {}); draft.dispose();
  expect(Object.keys(s.localStorage)).toHaveLength(1);
  expect(s.api.listDrafts('user')).toHaveLength(0);
  expect(Object.keys(s.localStorage)).toHaveLength(0);
});

test('images force an empty commit and share the pending request', async () => {
  let confirm;
  const s = setup({ commit: () => new Promise(resolve => { confirm = resolve; }) });
  const draft = s.api.newDraft('user');
  const first = draft.resolveProjectId(), second = draft.resolveProjectId();
  expect(s.requests).toHaveLength(1);
  expect(draft.needsUnloadWarning()).toBe(true);
  confirm(result);
  expect(await first).toBe('project');
  expect(await second).toBe('project');
  expect(draft.needsUnloadWarning()).toBe(false);
});

test('canonical URL reload resumes unsynchronized edits without repeating the POST', async () => {
  let confirm;
  const s = setup({ commit: () => new Promise(resolve => { confirm = resolve; }), save: async () => { throw new TypeError('offline'); } });
  const draft = s.api.newDraft('user');
  draft.update({ item: { title: '', titleAlign: 'left', content: content('a') } });
  const opening = draft.commit();
  draft.update({ item: { title: '', titleAlign: 'left', content: content('latest') } });
  confirm(result); await opening.catch(() => {}); draft.dispose();
  const recovered = s.api.editorDraftForRoute('user', 'project');
  expect(recovered.backup.latest.item.content).toBe(content('latest'));
  expect(recovered.backup.result.projectId).toBe('project');
  await recovered.commit().catch(() => {}); recovered.dispose();
  expect(s.requests).toHaveLength(1);
  expect(s.api.editorDraftForRoute('user', 'another-project')).toBe(null);
});

test('storage failure warns rather than claiming the text has a local backup', async () => {
  const s = setup({ storageFails: true, commit: async () => { throw new TypeError('offline'); } });
  const draft = s.api.newDraft('user');
  draft.update({ project: { title: 'kept in memory' } });
  await draft.commit().catch(() => {}); draft.dispose();
  expect(draft.getSnapshot().error).toContain('Local backup is unavailable');
  expect(draft.needsUnloadWarning()).toBe(true);
  expect(draft.backup.latest.project.title).toBe('kept in memory');
});

test('permanent API rejection does not retry in a loop', async () => {
  const failing = setup({ commit: async () => { throw new failing.DraftRequestError(403); } });
  const draft = failing.api.newDraft('user');
  draft.update({ project: { title: 'kept' } });
  await draft.commit().catch(() => {});
  expect(failing.requests).toHaveLength(1);
  expect(draft.getSnapshot().status).toBe('error');
  draft.dispose();
});

test('Retry-After controls transient retry timing', async () => {
  jest.useFakeTimers();
  try {
    const s = setup({ commit: async () => { throw new s.DraftRequestError(429, 5000); } });
    const draft = s.api.newDraft('user');
    draft.update({ project: { title: 'kept' } });
    await draft.commit().catch(() => {});
    await jest.advanceTimersByTimeAsync(4999);
    expect(s.requests).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(s.requests).toHaveLength(2);
    draft.dispose();
  } finally { jest.useRealTimers(); }
});

test('an image waits through a transient commit failure and uploads against the eventual ID', async () => {
  jest.useFakeTimers();
  try {
    let tries = 0;
    const s = setup({ commit: async () => { if (++tries === 1) throw new TypeError('offline'); return result; } });
    const draft = s.api.newDraft('user');
    const opening = draft.resolveProjectId();
    await jest.advanceTimersByTimeAsync(1000);
    expect(await opening).toBe('project');
    expect(s.requests).toHaveLength(2);
    expect(s.requests[0]).toEqual(s.requests[1]);
  } finally { jest.useRealTimers(); }
});

test('restoring effects after disposal still hands the IDs to the mounted editor', async () => {
  let confirm;
  const s = setup({ commit: () => new Promise(resolve => { confirm = resolve; }) });
  const draft = s.api.newDraft('user');
  const created = jest.fn();
  draft.start();
  draft.update({ project: { title: 'kept' } });
  const opening = draft.commit();
  draft.dispose();
  draft.setOnCreated(created);
  confirm(result); await opening;
  expect(created).toHaveBeenCalledTimes(1);
  expect(created).toHaveBeenCalledWith(result);
});

test('clearing a title during commit uses a default instead of restoring its first character', async () => {
  let confirm;
  const s = setup({ commit: () => new Promise(resolve => { confirm = resolve; }) });
  const draft = s.api.newDraft('user');
  draft.update({ project: { title: 'A' } });
  const opening = draft.commit();
  draft.update({ project: { title: '' } });
  confirm({ ...result, projectTitle: 'A' }); await opening;
  expect(s.titles).toContainEqual(['project', 'project', { title: 'Untitled project' }, 0, 'project']);
});

test('metadata synchronization preserves retryable HTTP errors without repeating creation', async () => {
  let confirm, attempts = 0;
  const s = setup({ commit: () => new Promise(resolve => { confirm = resolve; }), metadata: () => ++attempts === 1 ? { status: 503 } : { status: 200 } });
  const draft = s.api.newDraft('user');
  draft.update({ project: { title: 'A' } });
  const opening = draft.commit();
  draft.update({ project: { title: 'A title' } });
  confirm(result); await opening.catch(() => {});
  expect(draft.getSnapshot().status).toBe('error');
  await draft.commit();
  expect(s.requests).toHaveLength(1);
  expect(s.titles).toHaveLength(2);
  expect(draft.getSnapshot().status).toBe('saved');
});
