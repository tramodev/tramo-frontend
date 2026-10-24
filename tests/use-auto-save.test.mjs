// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup(restoreEpoch = 0, { userId, storage = {} } = {}) {
  const localStorage = {
    getItem: key => storage[key] ?? null,
    setItem: (key, value) => { storage[key] = value; },
    removeItem: key => { delete storage[key]; },
  };
  const backups = {};
  runInNewContext(ts.transpileModule(readFileSync('lib/item-content-backup.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: backups, localStorage });
  const refs = [], stateValues = [], reloads = [];
  const timers = new Map();
  const requests = [], snapshotRequests = [], bases = new Map();
  const statuses = [];
  const errors = [];
  const optimistic = [];
  const redirects = [];
  let refIndex = 0, stateIndex = 0;
  let timerId = 0;
  let cleanups = [];
  const listeners = new Map();
  const exports = {};
  const source = readFileSync('app/editor/[projectId]/hooks/useAutoSave.ts', 'utf8');
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: (name) => ({
      react: {
        useRef: (value) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
        useState: initial => { const i = stateIndex++; stateValues[i] ??= initial; return [stateValues[i], value => { stateValues[i] = value; (initial === 'idle' ? statuses : errors).push(value); }]; },
        useCallback: (fn) => fn,
        useEffect: (fn) => { cleanups.push(fn()); },
      },
      '@/lib/item-content-backup': backups,
      '@/lib/item-content-client': {
        getSavedItemContent: id => bases.get(id)?.content ?? '', getExtractionEpoch: id => bases.get(id)?.extractionEpoch ?? 0,
        acceptExtractionEpoch: (id, extractionEpoch, content) => bases.set(id, { extractionEpoch, content }),
        getItemContentSnapshot: id => new Promise((resolve, reject) => snapshotRequests.push({ id, resolve, reject })),
        saveItemContent: (itemId, content, epoch, projectId) => new Promise((resolve, reject) => {
          requests.push({ itemId, content, epoch, projectId, expectedContent: bases.get(itemId)?.content ?? '', extractionEpoch: bases.get(itemId)?.extractionEpoch ?? 0, resolve, reject });
        }),
      },
      '../../editor-utils': { isAuthError: error => error instanceof Error && error.message.includes('401') },
    })[name],
    setTimeout: (fn) => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: (id) => timers.delete(id),
    window: {
      location: { reload: () => reloads.push(true) },
      addEventListener: (name, fn) => { listeners.set(name, fn); },
      removeEventListener: () => {},
      dispatchEvent: () => {},
    },
    Event: class { constructor(type) { this.type = type; } },
    Error,
    console: { error: () => {} },
  });
  let hook;
  let currentItemId;
  function select(itemId) {
    currentItemId = itemId;
    for (const cleanup of cleanups) cleanup?.();
    cleanups = [];
    refIndex = stateIndex = 0;
    hook = exports.useAutoSave({
      contextId: itemId,
      userId,
      restoreEpoch,
      projectId: 'project-context',
      onOptimisticUpdate: (itemId, content) => optimistic.push([itemId, content]),
      redirectToLogin: () => redirects.push('/login'),
    });
  }
  return {
    requests, snapshotRequests, statuses, errors, optimistic, redirects, select, storage, backups, reloads,
    get status() { return hook.saveStatus; }, get error() { return hook.saveError; },
    keepRecovered: () => hook.onKeepRecoveredChanges?.(),
    discardRecovered: () => hook.onDiscardRecoveredChanges?.(),
    recover: (backup, serverContent = '') => hook.recoverItemContent(currentItemId, backup, serverContent),
    edit: (content) => hook.onChange(currentItemId, { read: (fn) => fn(), toJSON: () => content }),
    flush: () => { for (const [id, fn] of timers) { timers.delete(id); fn(); } },
    unload: (event) => listeners.get('beforeunload')(event),
    online: () => listeners.get('online')(),
    barrier: () => hook.flushPendingContent(),
    discard: (id) => hook.discardItem(id),
    pause: (id) => hook.pauseItem(id),
    resume: (id) => hook.resumeItem(id),
    acceptPersisted: (id) => hook.acceptPersistedItem(id),
    renameItem: (oldId, newId) => hook.renameItemId(oldId, newId),
    editItem: (id, content) => hook.onChange(id, { read: (fn) => fn(), toJSON: () => content }),
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('groups rapid edits into one project state update without delaying a flush', () => {
  const s = setup();
  s.select('a');
  s.edit('first');
  s.edit('latest');
  expect(s.optimistic).toEqual([]);
  s.barrier();
  expect(s.optimistic).toEqual([['a', JSON.stringify('latest')]]);
  s.requests[0].resolve();
});

test('saves serially and keeps only the latest pending content per item', async () => {
  const s = setup();
  s.select('a');
  s.edit('first');
  s.flush();
  s.edit('intermediate');
  s.flush();
  s.edit('latest');
  s.flush();
  expect(s.requests.length).toBe(1);
  s.requests[0].resolve();
  await settle();
  expect(s.requests.length).toBe(2);
  expect(s.requests[1].content).toBe(JSON.stringify('latest'));
  expect(s.statuses.at(-1)).not.toBe('saved');
  s.requests[1].resolve();
  await settle();
  expect(s.statuses.at(-1)).toBe('saved');
});

test('keeps pending changes across item switches and warns during unload', async () => {
  const s = setup();
  s.select('a');
  s.edit('first');
  s.flush();
  s.edit('latest a');
  s.select('b');
  expect(s.optimistic.at(-1)).toEqual(['a', JSON.stringify('latest a')]);
  s.edit('latest b');
  s.flush();
  let warned = false;
  s.unload({ preventDefault: () => { warned = true; } });
  expect(warned).toBe(true);
  expect(s.requests.length).toBe(1);
  s.requests[0].resolve();
  await settle();
  expect(s.requests[1].itemId).toBe('a');
  expect(s.requests[1].content).toBe(JSON.stringify('latest a'));
  s.requests[1].resolve();
  await settle();
  expect(s.requests[2].itemId).toBe('b');
  s.requests[2].resolve();
  await settle();
  expect(s.statuses.at(-1)).toBe('saved');
});

test('a failed save preserves newer content and does not retry in a loop', async () => {
  const s = setup();
  s.select('a');
  s.edit('old');
  s.flush();
  s.edit('new');
  s.flush();
  s.requests[0].reject(new Error('offline'));
  await settle();
  expect(s.requests.length).toBe(1);
  expect(s.statuses.at(-1)).toBe('error');
  s.select('b');
  expect(s.requests[1].content).toBe(JSON.stringify('new'));
  s.requests[1].resolve();
  await settle();
  expect(s.statuses.at(-1)).toBe('saved');
});

test('a resource limit explains the failure and retains the unsaved content', async () => {
  const s = setup();
  s.select('a');
  s.edit('unsaved content');
  s.flush();
  s.requests[0].reject(new Error('Storage quota exceeded. Remove content or upgrade your plan.'));
  await settle();
  expect(s.statuses.at(-1)).toBe('error');
  expect(s.errors.at(-1)).toContain('Storage quota exceeded');
  const retry = s.barrier();
  expect(s.requests[1].content).toBe(JSON.stringify('unsaved content'));
  s.requests[1].resolve();
  expect(await retry).toBe(true);
});

test('a temporary session outage keeps pending edits without redirecting to login', async () => {
  const s = setup();
  s.select('a');
  s.edit('unsaved during session outage');
  const first = s.barrier();
  s.requests[0].reject(new Error('Request failed with status 503'));
  expect(await first).toBe(false);
  expect(s.redirects).toEqual([]);
  const retry = s.barrier();
  expect(s.requests[1].content).toBe(JSON.stringify('unsaved during session outage'));
  s.requests[1].resolve();
  expect(await retry).toBe(true);
});


test('editing a non-visible item saves under its own id', async () => {
  const s = setup();
  s.select('visible');
  s.editItem('focused', 'text');
  s.flush();
  expect(s.requests[0].itemId).toBe('focused');
  s.requests[0].resolve();
  await settle();
});

test('deleted items never enqueue or restore pending writes', async () => {
  const s = setup();
  s.select('a');
  s.edit('text');
  s.flush();
  s.edit('pending');
  s.discard('a');
  s.requests[0].reject(new Error('deleted'));
  await settle();
  s.editItem('a', 'late');
  s.flush();
  expect(s.requests.length).toBe(1);
});


test('does not persist an incomplete image or a temporary preview', () => {
  const s = setup();
  s.select('a');
  s.edit({ root: { children: [{ type: 'image', version: 2, imageId: '' }] } });
  s.flush();
  expect(s.requests.length).toBe(0);
  s.edit({ root: { children: [{ type: 'image', version: 2, imageId: 'confirmed-id' }] } });
  s.flush();
  expect(s.requests.length).toBe(1);
  expect(s.requests[0].content).not.toContain('blob:');
});

test('warns before closing when an incomplete image is the only unsaved change', async () => {
  const s = setup();
  s.select('a');
  s.edit({ root: { children: [{ type: 'image', imageId: '' }] } });
  let warned = false;
  s.unload({ preventDefault: () => { warned = true; } });
  expect(warned).toBe(true);
  expect(s.requests).toHaveLength(0);
  s.edit({ root: { children: [{ type: 'image', imageId: 'confirmed-id' }] } });
  const saved = s.barrier();
  s.requests[0].resolve();
  expect(await saved).toBe(true);
  warned = false;
  s.unload({ preventDefault: () => { warned = true; } });
  expect(warned).toBe(false);
});

test('an incomplete image replaces Saved with Saving until its confirmed content is persisted', async () => {
  const s = setup();
  s.select('a');
  s.edit('saved text');
  const initial = s.barrier();
  s.requests[0].resolve();
  await initial;
  expect(s.statuses.at(-1)).toBe('saved');
  s.edit({ root: { children: [{ type: 'image', imageId: '' }] } });
  expect(s.statuses.at(-1)).toBe('saving');
  expect(await s.barrier()).toBe(false);
  s.edit({ root: { children: [{ type: 'image', imageId: 'ready' }] } });
  const confirmed = s.barrier();
  expect(s.statuses.at(-1)).toBe('saving');
  s.requests[1].resolve();
  expect(await confirmed).toBe(true);
  expect(s.statuses.at(-1)).toBe('saved');
});

test('completing another save or extraction never marks an incomplete image as saved', async () => {
  const s = setup();
  s.select('a');
  s.edit('in flight');
  const pending = s.barrier();
  s.editItem('b', { root: { children: [{ type: 'image', imageId: '' }] } });
  s.requests[0].resolve();
  expect(await pending).toBe(false);
  expect(s.statuses.at(-1)).toBe('saving');
  s.acceptPersisted('a');
  expect(s.statuses.at(-1)).toBe('saving');
});


test('export waits for in-flight content and drains newer pending edits', async () => {
  const s = setup(); s.select('a'); s.edit('first'); s.flush(); s.edit('latest');
  let finished = false;
  const barrier = s.barrier().then(result => { finished = true; return result; });
  await settle(); expect(finished).toBe(false);
  s.requests[0].resolve(); await settle();
  expect(s.requests[1].content).toBe(JSON.stringify('latest'));
  expect(finished).toBe(false);
  s.requests[1].resolve(); expect(await barrier).toBe(true);
});

test('failed content save cancels export and retains changes for retry', async () => {
  const s = setup(); s.select('a'); s.edit('unsaved');
  const first = s.barrier(); s.requests[0].reject(new Error('offline'));
  expect(await first).toBe(false);
  const retry = s.barrier(); expect(s.requests[1].content).toBe(JSON.stringify('unsaved'));
  s.requests[1].resolve(); expect(await retry).toBe(true);
});

test('incomplete image uploads block export instead of saving an older note snapshot', async () => {
  const s = setup(); s.select('a'); s.edit('older');
  s.edit({ root: { children: [{ type: 'image', imageId: '' }] } });
  expect(await s.barrier()).toBe(false); expect(s.requests).toHaveLength(0);
  s.edit({ root: { children: [{ type: 'image', imageId: 'ready-image' }] } });
  const retry = s.barrier(); s.requests[0].resolve(); expect(await retry).toBe(true);
});

test('pauses autosave during extraction and resumes without getting stuck on a synchronous empty flush', async () => {
  const s = setup(); s.select('a'); s.pause('a'); s.edit('during extraction');
  expect(await s.barrier()).toBe(false); expect(s.requests).toHaveLength(0);
  s.resume('a'); const saved = s.barrier(); expect(s.requests).toHaveLength(1);
  s.requests[0].resolve(); expect(await saved).toBe(true);
});

test('accepting a confirmed extraction discards obsolete pending snapshots and saves later edits', async () => {
  const s = setup(); s.select('a'); s.pause('a'); s.edit('old snapshot'); s.acceptPersisted('a'); s.resume('a');
  expect(await s.barrier()).toBe(true); expect(s.requests).toHaveLength(0);
  s.edit('after extraction'); const saved = s.barrier(); expect(s.requests[0].content).toBe(JSON.stringify('after extraction'));
  s.requests[0].resolve(); expect(await saved).toBe(true);
});

test('renameItemId migrates pending content to the real id', () => {
  const s = setup();
  s.select('a');
  s.editItem('a', 'text');
  s.renameItem('a', 'b');
  s.flush();
  expect(s.optimistic).toEqual([['a', JSON.stringify('text')]]);
  expect(s.requests[0].itemId).toBe('b');
});


test('autosave carries the loaded project generation without extra requests', async () => {
  const s = setup(7); s.select('a'); s.edit('changed');
  const saved = s.barrier();
  expect(s.requests).toHaveLength(1);
  expect(s.requests[0].epoch).toBe(7);
  expect(s.requests[0].projectId).toBe('project-context');
  s.requests[0].resolve(); expect(await saved).toBe(true);
});

test('a restoration conflict preserves local content and stops obsolete retries', async () => {
  const s = setup(2); s.select('a'); s.edit('local edit');
  const pending = s.barrier();
  const error = new Error('This project was restored. Reload before saving.'); error.name = 'ProjectVersionConflict';
  s.requests[0].reject(error);
  expect(await pending).toBe(false);
  s.edit('newer local edit'); s.flush();
  expect(await s.barrier()).toBe(false);
  expect(s.requests).toHaveLength(1);
  expect(s.optimistic.at(-1)).toEqual(['a', JSON.stringify('newer local edit')]);
  expect(s.errors.at(-1)).toContain('restored');
});


test('reconnecting retries the latest content after an offline failure', async () => {
  const s = setup(); s.select('a'); s.edit('before failure');
  const pending = s.barrier();
  s.edit('latest embed draft');
  s.requests[0].reject(new TypeError('Failed to fetch'));
  expect(await pending).toBe(false);
  s.online();
  expect(s.requests[1].content).toBe(JSON.stringify('latest embed draft'));
  s.requests[1].resolve(); await settle();
  expect(s.statuses.at(-1)).toBe('saved');
});


const embedContent = text => ({ root: { type: 'root', children: [{ type: 'equation', equation: text, inline: false, version: 1 }] } });

test('offline embed edits survive a new hook instance and sync only after restoration', async () => {
  const storage = {};
  const s = setup(0, { userId: 'alice', storage }); s.select('a'); s.edit(embedContent('k=1'));
  const backup = s.backups.readItemContentBackup('alice', 'project-context', 'a');
  expect(backup.content).toBe(JSON.stringify(embedContent('k=1')));
  const failed = s.barrier(); s.requests[0].reject(new TypeError('Failed to fetch')); expect(await failed).toBe(false);
  const recovered = setup(0, { userId: 'alice', storage }); recovered.select('a');
  recovered.recover(backup); recovered.flush();
  expect(recovered.requests[0].content).toBe(backup.content);
  recovered.requests[0].resolve(); await settle();
  expect(recovered.backups.readItemContentBackup('alice', 'project-context', 'a')).toBeNull();
});

test('saving an older snapshot retains a newer offline backup and advances its base', async () => {
  const s = setup(0, { userId: 'alice' }); s.select('a'); s.edit(embedContent('first'));
  s.flush(); s.edit(embedContent('latest')); s.requests[0].resolve(); await settle();
  const backup = s.backups.readItemContentBackup('alice', 'project-context', 'a');
  expect(backup.content).toBe(JSON.stringify(embedContent('latest')));
  expect(backup.expectedContent).toBe(JSON.stringify(embedContent('first')));
  s.requests[1].reject(new TypeError('Failed to fetch')); await settle();
  expect(s.backups.readItemContentBackup('alice', 'project-context', 'a').content).toBe(backup.content);
});

test.each([
  { restoreEpoch: 1, extractionEpoch: 0, expectedContent: '' },
  { restoreEpoch: 0, extractionEpoch: 1, expectedContent: '' },
  { restoreEpoch: 0, extractionEpoch: 0, expectedContent: 'older server version' },
])('recovered edits never overwrite a changed server generation or content: %j', fields => {
  const s = setup(0, { userId: 'alice' }); s.select('a');
  s.recover({ ...fields, content: JSON.stringify(embedContent('recovered')) }); s.flush();
  expect(s.requests).toHaveLength(0);
  expect(s.statuses.at(-1)).toBe('error');
  expect(s.errors.at(-1)).toContain('changed on the server');
});

test('content backups stay scoped to their user and project and exclude unfinished images', () => {
  const s = setup(0, { userId: 'alice' }); s.select('a');
  s.edit({ root: { type: 'root', children: [{ type: 'image', imageId: '' }, { type: 'music', abc: 'K:C\nCDEF|' }] } });
  expect(s.backups.readItemContentBackup('bob', 'project-context', 'a')).toBeNull();
  expect(s.backups.readItemContentBackup('alice', 'another-project', 'a')).toBeNull();
  expect(s.backups.readItemContentBackup('alice', 'project-context', 'a').content).not.toContain('image');
  s.discard('a'); expect(s.backups.readItemContentBackup('alice', 'project-context', 'a')).toBeNull();
});


test('temporary note IDs migrate their local content backups', () => {
  const s = setup(0, { userId: 'alice' }); s.select('temp'); s.edit(embedContent('draft'));
  s.renameItem('temp', 'real');
  expect(s.backups.readItemContentBackup('alice', 'project-context', 'temp')).toBeNull();
  expect(s.backups.readItemContentBackup('alice', 'project-context', 'real').content).toBe(JSON.stringify(embedContent('draft')));
});

test.each(['{', '{}', '{"content":123}', '{"content":"null","expectedContent":"","restoreEpoch":0,"extractionEpoch":0}'])('malformed local content is rejected: %s', raw => {
  const s = setup(0, { storage: { 'tramo:item-content:alice:project-context:a': raw } });
  expect(s.backups.readItemContentBackup('alice', 'project-context', 'a')).toBeNull();
});


test('discarding recovered conflicts keeps other offline note backups', () => {
  const s = setup(0, { userId: 'alice' }); s.select('a');
  s.edit(embedContent('conflict')); s.editItem('b', embedContent('other unsaved note'));
  s.recover({ content: JSON.stringify(embedContent('conflict')), expectedContent: 'changed remotely', restoreEpoch: 0, extractionEpoch: 0 });
  s.select('a'); s.discardRecovered();
  expect(s.backups.readItemContentBackup('alice', 'project-context', 'a')).toBeNull();
  expect(s.backups.readItemContentBackup('alice', 'project-context', 'b')).not.toBeNull();
  expect(s.reloads).toHaveLength(1);
  expect(s.requests).toHaveLength(0);
});


test('typing during a recovery conflict keeps the error visible and backs up the latest changes', () => {
  const s = setup(0, { userId: 'alice' }); s.select('a');
  s.recover({ content: JSON.stringify(embedContent('recovered')), expectedContent: 'old server', restoreEpoch: 0, extractionEpoch: 0 }, 'server newer');
  s.edit(embedContent('edited while deciding')); s.select('a'); s.flush();
  expect(s.status).toBe('error');
  expect(s.error).toContain('Keep my version');
  expect(s.requests).toHaveLength(0);
  expect(s.backups.readItemContentBackup('alice', 'project-context', 'a').content).toBe(JSON.stringify(embedContent('edited while deciding')));
});

test('keeping the recovered version saves the latest local edits against a fresh server snapshot', async () => {
  const s = setup(0, { userId: 'alice' }); s.select('a');
  s.recover({ content: JSON.stringify(embedContent('recovered')), expectedContent: 'old', restoreEpoch: 0, extractionEpoch: 0 }, 'server newer');
  s.select('a'); const keeping = s.keepRecovered();
  s.edit(embedContent('last local change'));
  expect(s.requests).toHaveLength(0);
  s.snapshotRequests[0].resolve({ content: 'fresh server', extractionEpoch: 2 }); await settle();
  expect(s.requests[0]).toMatchObject({ content: JSON.stringify(embedContent('last local change')), expectedContent: 'fresh server', extractionEpoch: 2 });
  s.requests[0].resolve(); await keeping; s.select('a');
  expect(s.status).toBe('saved');
  expect(s.backups.readItemContentBackup('alice', 'project-context', 'a')).toBeNull();
});

test('a failed conflict resolution keeps the local backup and remains actionable', async () => {
  const s = setup(0, { userId: 'alice' }); s.select('a'); s.edit(embedContent('local'));
  s.recover({ content: JSON.stringify(embedContent('local')), expectedContent: 'old', restoreEpoch: 0, extractionEpoch: 0 }, 'new');
  s.select('a'); const keeping = s.keepRecovered();
  s.snapshotRequests[0].reject(new Error('Offline')); await keeping; s.select('a');
  expect(s.status).toBe('error'); expect(s.error).toContain('Offline');
  expect(s.backups.readItemContentBackup('alice', 'project-context', 'a')).not.toBeNull();
  expect(s.requests).toHaveLength(0);
});
