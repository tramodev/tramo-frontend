import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup() {
  const states = [], refs = [], timers = new Map();
  let index = 0, refIndex = 0, nextTimer = 0;
  const react = {
    useState: initial => {
      const slot = index++;
      if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial;
      return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }];
    },
    useRef: value => refs[refIndex++] ??= { current: value },
    useCallback: fn => fn,
    useEffect: () => {},
  };
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/[projectId]/hooks/useAutoSave.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, Map, Set, Object,
    setTimeout: fn => { timers.set(++nextTimer, fn); return nextTimer; },
    clearTimeout: id => timers.delete(id),
    require: name => ({ react, '@/app/editor/note-content': { serializeNoteContent: JSON.stringify } })[name],
  });
  const render = () => { index = 0; refIndex = 0; return exports.useAutoSave({ onOptimisticUpdate: () => {} }); };
  return { render, elapse: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); } };
}

test('quick syncs never show saving and a slow one does until it settles', () => {
  const s = setup();
  s.render().setCollabStatus('a', 'syncing');
  expect(s.render().saveStatus).toBe('idle');
  expect(s.render().contentSynced).toBe(false);
  s.render().setCollabStatus('a', 'synced');
  s.elapse();
  expect(s.render().saveStatus).toBe('idle');
  expect(s.render().contentSynced).toBe(true);

  s.render().setCollabStatus('a', 'syncing');
  s.elapse();
  expect(s.render().saveStatus).toBe('saving');
  s.render().setCollabStatus('a', 'synced');
  expect(s.render().saveStatus).toBe('idle');
});

test('offline is always reported as an error', () => {
  const s = setup();
  s.render().setCollabStatus('a', 'offline');
  expect(s.render().saveStatus).toBe('error');
  expect(s.render().saveError).toContain('Offline');
});
