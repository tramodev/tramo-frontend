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
function setup({ commit, save, metadata, storageFails = false, local = storage(storageFails), session = storage(), locks } = {}) {
  const localStorage = local, sessionStorage = session;
  const requests = [], saves = [], titles = [];
  let seed;
  const client = {};
  runInNewContext(ts.transpileModule(readFileSync('lib/editor-draft-client.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: client, Error });
  const { DraftRequestError } = client;
  const exports = {}, utils = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/editor-utils.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: utils });
  const jsx = { exports, Error, TypeError, Date, setTimeout, clearTimeout, crypto: { randomUUID }, navigator: { locks }, localStorage, sessionStorage };
  runInNewContext(ts.transpileModule(readFileSync('lib/editor-draft.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { ...jsx, require: name => ({
    '@/app/editor/editor-utils': utils,
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

test('empty drafts never force a commit', async () => {
  const s = setup({ commit: async () => { throw new TypeError('offline'); } });
  const draft = s.api.newDraft('user');
  await expect(draft.commit()).rejects.toThrow('Write something first.'); draft.dispose();
  expect(s.requests).toHaveLength(0);
  expect(Object.keys(s.localStorage)).toHaveLength(0);
  expect(s.api.listDrafts('user')).toHaveLength(0);
  expect(Object.keys(s.localStorage)).toHaveLength(0);
});

test('an image-first draft uploads without creating an empty project', async () => {
  const s = setup(), draft = s.api.newDraft('user');
  expect(await draft.resolveProjectId()).toBeUndefined();
  expect(s.requests).toHaveLength(0);
  draft.setPendingImages(true);
  expect(draft.needsUnloadWarning()).toBe(true);
  draft.setPendingImages(false);
  expect(draft.needsUnloadWarning()).toBe(false);
  expect(s.requests).toHaveLength(0);
  draft.update({ item: { title: '', titleAlign: 'left', content: JSON.stringify({ root: { children: [{ type: 'image', imageId: 'confirmed' }] } }) } });
  await draft.commit();
  expect(s.requests).toHaveLength(1);
});

test('canonical URL reload resumes unsynchronized edits after verifying the idempotent receipt', async () => {
  let confirm;
  const s = setup({ commit: () => s.requests.length === 1 ? new Promise(resolve => { confirm = resolve; }) : result, save: async () => { throw new TypeError('offline'); } });
  const draft = s.api.newDraft('user');
  draft.update({ item: { title: '', titleAlign: 'left', content: content('a') } });
  const opening = draft.commit();
  draft.update({ item: { title: '', titleAlign: 'left', content: content('latest') } });
  confirm(result); await opening.catch(() => {}); draft.dispose();
  const recovered = s.api.editorDraftForRoute('user', 'project');
  expect(recovered.backup.latest.item.content).toBe(content('latest'));
  expect(recovered.backup.result.projectId).toBe('project');
  await recovered.commit().catch(() => {}); recovered.dispose();
  expect(s.requests).toHaveLength(2);
  expect(s.requests[1]).toEqual(s.requests[0]);
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
  const failing = setup({ commit: async () => { throw new failing.DraftRequestError('Request failed with status 403', 403); } });
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
    const s = setup({ commit: async () => { throw new s.DraftRequestError('Request failed with status 429', 429, 5000); } });
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
    draft.update({ project: { title: 'Written title' } });
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

test.each(['\u200b', '\u200c', '\u200d', '\u2060', '\u00a0', '\u3000'])(
  'invisible text does not create a project (%j)', async text => {
    const s = setup(), draft = s.api.newDraft('user');
    draft.update({ item: { title: '', titleAlign: 'left', content: content(text) } });
    await settle();
    expect(s.requests).toHaveLength(0);
    expect(Object.keys(s.localStorage)).toHaveLength(0);
  });

test('slash queries do not suppress other written paragraphs', async () => {
  const s = setup(), draft = s.api.newDraft('user');
  const body = JSON.parse(content('Written'));
  body.root.children.push(...JSON.parse(content('/image')).root.children);
  draft.update({ item: { title: '', titleAlign: 'left', content: JSON.stringify(body) } });
  await draft.commit();
  expect(s.requests).toHaveLength(1);
});

test('body-only drafts have a text excerpt and clearing another account removes its drafts', async () => {
  const s = setup({ commit: async () => { throw new TypeError('offline'); } });
  const alice = s.api.newDraft('alice');
  alice.update({ item: { title: '', titleAlign: 'left', content: content('An unfinished note') } });
  await alice.commit().catch(() => {}); alice.dispose();
  expect(s.api.draftLabel(alice.backup)).toBe('An unfinished note');
  const bob = s.api.newDraft('bob');
  bob.update({ project: { title: 'Bob draft' } });
  await bob.commit().catch(() => {}); bob.dispose();
  s.api.clearLocalDrafts('bob');
  expect(s.api.listDrafts('alice')).toHaveLength(0);
  expect(s.api.listDrafts('bob')).toHaveLength(1);
  s.api.clearLocalDrafts();
  expect(Object.keys(s.localStorage).filter(key => key.startsWith('tramo:draft:'))).toHaveLength(0);
  expect(s.localStorage.getItem('tramo:draft-owner')).toBe('');
  expect(Object.keys(s.sessionStorage)).toHaveLength(0);
});

test('signing out prevents an in-flight save from recreating the local backup', async () => {
  let fail;
  const s = setup({ commit: () => new Promise((_resolve, reject) => { fail = reject; }) });
  const draft = s.api.newDraft('alice');
  draft.update({ project: { title: 'Private unfinished text' } });
  const opening = draft.commit();
  s.api.clearLocalDrafts();
  fail(new s.DraftRequestError('Request failed with status 403', 403));
  await opening.catch(() => {});
  expect(s.api.listDrafts('alice')).toHaveLength(0);
});

test('recovery of a deleted project creates a new project with the latest local content', async () => {
  let attempts = 0;
  const s = setup({ commit: async () => {
    if (++attempts === 1) throw new s.DraftRequestError('Request failed with status 404', 404);
    return { ...result, projectId: 'recovered' };
  } });
  const draft = s.api.newDraft('alice');
  const originalId = draft.backup.clientRequestId;
  draft.backup.latest.project.title = 'Private note';
  draft.backup.submitted = structuredClone(draft.backup.latest);
  draft.backup.latest.item.content = content('Latest unsynced edits');
  draft.backup.result = result;
  const created = jest.fn();
  draft.setOnCreated(created);
  draft.start();
  await draft.commit();
  expect(s.requests).toHaveLength(2);
  expect(s.requests[1].id).not.toBe(originalId);
  expect(s.requests[1].snapshot.item.content).toBe(content('Latest unsynced edits'));
  expect(created).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'recovered' }));
  expect(draft.getSnapshot().status).toBe('saved');
});

test.each(['/youtube', '/etc/hosts'])('slash text is saved as ordinary content (%s)', async text => {
  const s = setup(), draft = s.api.newDraft('user');
  draft.update({ item: { title: '', titleAlign: 'left', content: content(text) } });
  await draft.commit();
  expect(s.requests[0].snapshot.item.content).toBe(content(text));
});

test('tabs with copied session storage fork a live draft and keep the original backup', async () => {
  const held = new Set();
  const locks = { request: async (key, _options, callback) => {
    if (held.has(key)) return callback(null);
    held.add(key);
    try { return await callback({ name: key }); }
    finally { held.delete(key); }
  } };
  const first = setup({ locks, commit: async () => { throw new TypeError('offline'); } });
  const original = first.api.newDraft('user');
  await original.claim();
  original.update({ project: { title: 'Original text' } });
  await original.commit().catch(() => {});
  const second = setup({ locks, local: first.localStorage, session: storage(), commit: async () => { throw new TypeError('offline'); } });
  Object.assign(second.sessionStorage, first.sessionStorage);
  const duplicate = second.api.newDraft('user');
  await duplicate.claim();
  expect(duplicate.backup.clientRequestId).not.toBe(original.backup.clientRequestId);
  expect(duplicate.backup.submitted).toBeUndefined();
  duplicate.update({ project: { title: 'Duplicate text' } });
  await duplicate.commit().catch(() => {});
  expect(first.api.readDraft('user', original.backup.clientRequestId).latest.project.title).toBe('Original text');
  expect(second.api.readDraft('user', duplicate.backup.clientRequestId).latest.project.title).toBe('Duplicate text');
  original.dispose(); duplicate.dispose();
  await settle();
  const reloaded = first.api.newDraft('user');
  await reloaded.claim();
  expect(reloaded.backup.clientRequestId).toBe(original.backup.clientRequestId);
  reloaded.dispose();
});


test('opening and cancelling the slash menu never creates an empty project', async () => {
  const s = setup(), draft = s.api.newDraft('user');
  draft.start();
  draft.update({ item: { ...draft.backup.latest.item, content: content('/') } });
  await settle();
  expect(s.requests).toHaveLength(0);
  draft.update({ item: { ...draft.backup.latest.item, content: content('') } });
  await settle();
  expect(s.requests).toHaveLength(0);
  expect(s.api.hasDraftContent(draft.backup.latest)).toBe(false);
});

test('a draft title is backed up immediately and committed once after typing stops', async () => {
  jest.useFakeTimers();
  try {
    const s = setup(), draft = s.api.newDraft('user');
    let title = '';
    for (const letter of 'Titulo de nota largo') {
      title += letter;
      draft.update({ item: { ...draft.backup.latest.item, title } }, true);
      expect(s.api.readDraft('user', draft.backup.clientRequestId).latest.item.title).toBe(title);
      await jest.advanceTimersByTimeAsync(30);
    }
    expect(s.requests).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(600);
    expect(s.requests).toHaveLength(1);
    expect(s.requests[0].snapshot.item.title).toBe('Titulo de nota largo');
    expect(draft.getSnapshot().status).toBe('saved');
    draft.dispose();
  } finally { jest.useRealTimers(); }
});

test('a title typed during draft creation waits for debounce before metadata synchronization', async () => {
  jest.useFakeTimers();
  try {
    let confirm;
    const s = setup({ commit: () => new Promise(resolve => { confirm = resolve; }) });
    const draft = s.api.newDraft('user');
    draft.update({ item: { ...draft.backup.latest.item, content: content('Body') } });
    const opening = draft.commit();
    draft.update({ item: { ...draft.backup.latest.item, title: 'T' } }, true);
    confirm(result);
    await jest.advanceTimersByTimeAsync(30);
    draft.update({ item: { ...draft.backup.latest.item, title: 'Titulo de nota largo' } }, true);
    await jest.advanceTimersByTimeAsync(599);
    expect(s.titles).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1);
    await opening;
    expect(s.titles).toHaveLength(1);
    expect(s.titles[0][2].title).toBe('Titulo de nota largo');
    draft.dispose();
  } finally { jest.useRealTimers(); }
});

test('clearing a pending draft title removes its backup without creating a project', async () => {
  jest.useFakeTimers();
  try {
    const s = setup(), draft = s.api.newDraft('user');
    draft.update({ item: { ...draft.backup.latest.item, title: 'T' } }, true);
    draft.update({ item: { ...draft.backup.latest.item, title: '' } }, true);
    await jest.advanceTimersByTimeAsync(1000);
    expect(s.requests).toHaveLength(0);
    expect(s.api.listDrafts('user')).toHaveLength(0);
    draft.dispose();
  } finally { jest.useRealTimers(); }
});

test('account cleanup also clears pending note titles without exposing another account', () => {
  const s = setup();
  s.localStorage.setItem('tramo:item-title:alice:project:12', 'private');
  s.localStorage.setItem('tramo:item-title:bob:project:13', 'kept');
  s.api.clearLocalDrafts('bob');
  expect(s.localStorage.getItem('tramo:item-title:alice:project:12')).toBeNull();
  expect(s.localStorage.getItem('tramo:item-title:bob:project:13')).toBe('kept');
  s.api.clearLocalDrafts();
  expect(s.localStorage.getItem('tramo:item-title:bob:project:13')).toBeNull();
});

test('debouncing a newer draft title never bypasses metadata Retry-After', async () => {
  jest.useFakeTimers();
  try {
    let attempts = 0;
    const s = setup({ metadata: () => ++attempts === 1 ? { status: 429, retryAfter: 5000 } : { status: 200 } });
    const draft = s.api.newDraft('user');
    draft.update({ item: { ...draft.backup.latest.item, content: content('Body') } });
    draft.update({ item: { ...draft.backup.latest.item, title: 'First' } }, true);
    await jest.advanceTimersByTimeAsync(600);
    expect(draft.getSnapshot().status).toBe('error');
    draft.update({ item: { ...draft.backup.latest.item, title: 'Latest' } }, true);
    await jest.advanceTimersByTimeAsync(4999);
    expect(s.titles).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(s.titles).toHaveLength(2);
    expect(s.titles[1][2].title).toBe('Latest');
    expect(draft.getSnapshot().status).toBe('saved');
    draft.dispose();
  } finally { jest.useRealTimers(); }
});
