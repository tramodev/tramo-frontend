import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

function dialog(request) {
  const state = [];
  let index = 0;
  let effect;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('components/project/project-usage-dialog.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: name => ({
      react: {
        useState: initial => {
          const slot = index++;
          if (!(slot in state)) state[slot] = initial;
          return [state[slot], value => { state[slot] = typeof value === 'function' ? value(state[slot]) : value; }];
        },
        useEffect: callback => { effect = callback; },
      },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      '@/lib/projects-store': { getProjectStorage: request },
      '@/components/profile/plan-panel': { StorageMeter: 'StorageMeter' },
      '@/components/ui/button': { Button: 'Button' },
    })[name] ?? {},
  });
  return {
    render: () => {
      index = 0;
      return flatten(exports.ProjectUsageDialog({ project: { id: 'project-a', title: 'Project A' }, onClose() {} }));
    },
    load: async () => {
      const cleanup = effect();
      await Promise.resolve();
      await Promise.resolve();
      return cleanup;
    },
  };
}

test('project usage loads its breakdown on demand', async () => {
  const storage = { storageUsedBytes: 100, storageImageBytes: 75, storageTextBytes: 25 };
  const view = dialog(async id => { expect(id).toBe('project-a'); return storage; });
  expect(view.render().some(node => node.props.role === 'status')).toBe(true);
  await view.load();
  expect(view.render().find(node => node.type === 'StorageMeter').props.status).toEqual(storage);
});

test('failed project usage can be retried', async () => {
  let failed = true;
  const view = dialog(async () => {
    if (failed) throw new Error('Unavailable');
    return { storageUsedBytes: 0, storageImageBytes: 0, storageTextBytes: 0 };
  });
  view.render();
  await view.load();
  const nodes = view.render();
  expect(nodes.some(node => node.props.role === 'alert')).toBe(true);
  failed = false;
  nodes.find(node => node.type === 'Button').props.onClick();
  expect(view.render().some(node => node.props.role === 'status')).toBe(true);
  await view.load();
  expect(view.render().some(node => node.type === 'StorageMeter')).toBe(true);
});
