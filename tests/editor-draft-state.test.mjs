import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('the draft remaps every ID without bootstrapping or changing the editor keys', async () => {
  const exports = {}, states = [], refs = [], deps = [], pending = [], replacements = [], changes = [], pendingImages = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0, bootstraps = 0, ordinarySaves = 0;
  const renames = [];
  const user = { userId: '1', username: 'owner', imageUrl: null };
  const draft = {
    editorKey: 'draft-note', backup: { latest: { project: { title: '' }, trail: { title: '' }, item: { title: '', titleAlign: 'left', content: '' } } },
    state: { status: 'draft', error: '' },
    subscribe() { return () => {}; },
    getSnapshot() { return draft.state; },
    setOnCreated(callback) { draft.onCreated = callback; },
    async claim() {}, start() {}, dispose() {}, retry() {}, needsUnloadWarning() { return false; },
    setPendingImages: pending => pendingImages.push(pending),
    update(change) { Object.assign(draft.backup.latest, change); changes.push(change); },
  };
  const titleSaves = {};
  runInNewContext(ts.transpileModule(readFileSync('lib/item-title-saves.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: titleSaves, setTimeout: () => 0, clearTimeout() {},
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    require: name => name === '@/lib/projects-store' ? { saveDraftMetadata: async (projectId, _entity, id, fields, epoch) => {
      renames.push([id, fields.title, epoch, projectId]); return { status: 200 };
    } } : {},
  });
  const router = { replace: url => replacements.push(url) };
  runInNewContext(ts.transpileModule(readFileSync('app/editor/[projectId]/hooks/useProjectEditorState.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, URLSearchParams,
    window: { location: { pathname: '/editor/new', search: '' }, addEventListener() {}, removeEventListener() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    require: name => ({
      react: {
        useState: initial => { const i = stateIndex++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
          return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
        useRef: initial => refs[refIndex++] ??= { current: initial },
        useCallback: fn => fn,
        useMemo: fn => fn(),
        useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
        useEffect: (callback, next) => { const i = effectIndex++; if (!deps[i] || next.some((value, j) => value !== deps[i][j])) pending.push(callback); deps[i] = next; },
      },
      'next/navigation': { useRouter: () => router },
      '@/lib/editor-draft': { editorDraftForRoute: () => draft, clearLocalDrafts() {} },
      '@/lib/pending-saves': { createPendingSaves: () => ({ track: (_key, action) => action(), flush: async () => {} }) },
      '@/lib/item-title-saves': titleSaves,
      '@/lib/project-validation': { assertProjectText() {} },
      '@/lib/projects-store': { renameItem: async (...args) => { renames.push(args); } },
      '../../editor-utils': { countTextStats: () => ({ words: 0, characters: 0 }), lastItemStorageKey: id => id },
      '@/lib/editor-bootstrap-client': { getEditorBootstrap: () => { bootstraps++; throw new Error('Drafts must not bootstrap'); } },
      '@/app/editor/[projectId]/hooks/useAutoSave': { useAutoSave: () => ({ saveStatus: 'idle', saveError: '', onChange: () => { ordinarySaves++; } }) },
    })[name] ?? {},
  });
  const render = (id = 'new', replayEffects = false) => {
    stateIndex = refIndex = effectIndex = 0;
    const hook = exports.useProjectEditorState(id, false, user);
    pending.splice(0).forEach(effect => {
      const cleanup = effect();
      if (replayEffects) { cleanup?.(); effect(); }
    });
    return hook;
  };
  render('new', true); await new Promise(resolve => setImmediate(resolve));
  let hook = render();
  expect(hook.loaded).toBe(true);
  expect(hook.selectedItemId).toBe('draft-note');
  expect(hook.isDraft).toBe(true);
  hook.onDraftProjectTitle('Project');
  hook.onDraftTrailTitle('draft-note', 'Trail');
  hook.onDraftItemTitle('draft-note', 'Note');
  hook.onChange('draft-note', { toJSON: () => ({ root: { children: [{ type: 'image', imageId: '' }] } }) });
  expect(changes[3].item.content).toBe(JSON.stringify({ root: { children: [] } }));
  expect(pendingImages.at(-1)).toBe(true);
  expect(changes).toHaveLength(4);
  expect(ordinarySaves).toBe(0);
  const beforeCreated = hook;
  draft.backup.result = { projectId: 'real', trailId: 21, itemId: 22, restoreEpoch: 0 };
  draft.state = { status: 'syncing', error: '' };
  draft.onCreated(draft.backup.result);
  hook = render('real');
  expect(hook.projectId).toBe('real');
  expect(hook.selectedItemId).toBe('22');
  expect(hook.activeTrailId).toBe('21');
  expect(hook.items['22'].editorKey).toBe('draft-note');
  expect(hook.trails[0].editorKey).toBe('draft-note');
  expect(hook.trails[0].itemIds).toEqual(['22']);
  expect(hook.trails[0].steps).toEqual([{ itemId: '22' }]);
  expect(hook.navigationRequest.focus).toBe(true);
  expect(replacements).toEqual(['/editor/real']);
  expect(bootstraps).toBe(0);
  draft.state = { status: 'saved', error: '' };
  beforeCreated.onDraftItemTitle('draft-note', 'Final character before render');
  expect(renames).toHaveLength(0);
  await beforeCreated.flushProjectChanges();
  expect(renames.at(-1)).toEqual(['22', 'Final character before render', 0, 'real']);
  hook = render('real');
  expect(hook.isDraft).toBe(false);
  hook.onDraftItemTitle('draft-note', 'Title still being typed');
  hook.onDraftItemTitle('other-note', 'Another title');
  expect(render('real').saveStatus).toBe('saving');
  await hook.flushProjectChanges();
  expect(render('real').saveStatus).toBe('saved');
  expect(renames.slice(1).map(args => args.slice(0, 2))).toEqual([['22', 'Title still being typed'], ['other-note', 'Another title']]);
  hook.onChange('22', { toJSON: () => ({ root: { children: [] } }) });
  expect(pendingImages.at(-1)).toBe(false);
  expect(ordinarySaves).toBe(1);
  expect(render('real').selectedItem.title).toBe('Title still being typed');
});
