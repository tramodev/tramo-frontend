import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup(project = { items: {}, loaded: false }) {
  const effects = [], listeners = [], removed = [];
  const document = { title: 'Editor | Tramo' };
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('app/editor/editor-workspace.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    document,
    localStorage: { getItem: () => null, setItem() {} },
    window: {
      addEventListener: (...args) => listeners.push(args),
      removeEventListener: (...args) => removed.push(args),
    },
    require: name => ({
      react: { useState: value => [typeof value === 'function' ? value() : value, () => {}], useEffect: effect => effects.push(effect), useMemo: fn => fn(), useRef: value => ({ current: value }) },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'next/navigation': { useParams: () => ({ projectId: 'project' }) },
      '@/app/editor/editor-utils': { countProjectTextStats: () => null },
      '@/app/editor/[projectId]/hooks/useProjectEditorState': { useProjectEditorState: () => project },
    })[name] ?? {},
  });
  exports.ProjectEditor({ routeProjectId: 'project', user: { userId: '1', username: 'owner' } });
  const cleanups = effects.map(effect => effect());
  const listener = listeners.find(([type]) => type === 'keydown');
  const send = (keys, target = { closest: () => null }) => {
    let stopped = false;
    listener[1]({ ...keys, target, stopImmediatePropagation: () => { stopped = true; }, preventDefault: () => { throw new Error('Native formatting must not be prevented'); } });
    return stopped;
  };
  return { listener, removed, send, document, cleanup: () => cleanups.forEach(cleanup => cleanup?.()) };
}

test.each([{ key: 'b', metaKey: true }, { key: 'b', ctrlKey: true }, { key: 'B', metaKey: true }])('blocks the global shortcut before it reaches the sidebar listener: %j', keys => {
  const s = setup();
  expect(s.listener[2]).toBe(true);
  expect(s.send(keys)).toBe(true);
});

test('keeps bold available in Lexical and editable fields', () => {
  const s = setup();
  for (const target of [{ isContentEditable: true }, { closest: () => ({}) }]) {
    expect(s.send({ key: 'b', metaKey: true }, target)).toBe(false);
    expect(s.send({ key: 'b', ctrlKey: true }, target)).toBe(false);
  }
});

test.each([{ key: 'b' }, { key: 'p', metaKey: true }, { key: 'Enter', ctrlKey: true }])('leaves other editor shortcuts unchanged: %j', keys => {
  expect(setup().send(keys)).toBe(false);
});

test('removes the capture listener when leaving the editor', () => {
  const s = setup(); s.cleanup();
  expect(s.removed).toEqual([s.listener]);
});

test.each(['My project', 'Renamed project', '<script>alert(1)</script>'])('uses the loaded project name in the browser tab: %s', projectTitle => {
  expect(setup({ items: {}, loaded: true, projectTitle }).document.title).toBe(`${projectTitle} | Tramo`);
});

test('keeps the default browser title while the project is loading', () => {
  expect(setup({ items: {}, loaded: false, projectTitle: '' }).document.title).toBe('Editor | Tramo');
});
