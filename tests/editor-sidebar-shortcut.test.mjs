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
      react: { useState: value => [typeof value === 'function' ? value() : value, () => {}], useEffect: effect => effects.push(effect), useMemo: fn => fn(), useSyncExternalStore: () => false, useRef: value => ({ current: value }) },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'next/navigation': { useParams: () => ({ projectId: 'project' }), useRouter: () => ({}) },
      '@/lib/notification-stream': { subscribeNotificationCount: () => () => {} },
      '@/app/editor/editor-utils': { countProjectTextStats: () => null },
      '@/app/editor/[projectId]/hooks/useCollabSocket': { useCollabSocket: () => null },
      '@/app/editor/[projectId]/hooks/useProjectEditorState': { useProjectEditorState: () => project },
    })[name] ?? {},
  });
  exports.ProjectEditor({ routeProjectId: 'project', user: { userId: '1', username: 'owner' } });
  effects.forEach(effect => effect());
  const listener = listeners.find(([type]) => type === 'keydown');
  return { listener, removed, document };
}

test('leaves the sidebar shortcut to the sidebar and keeps bold in the editor', () => {
  const s = setup();
  expect(s.listener).toBeUndefined();
});

test.each(['My project', 'Renamed project', '<script>alert(1)</script>'])('uses the loaded project name in the browser tab: %s', projectTitle => {
  expect(setup({ items: {}, loaded: true, projectTitle }).document.title).toBe(`${projectTitle} | Tramo`);
});

test('keeps the default browser title while the project is loading', () => {
  expect(setup({ items: {}, loaded: false, projectTitle: '' }).document.title).toBe('Editor | Tramo');
});
