import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup(hasDrafts, storageFails = false) {
  const exports = {}, states = [], calls = [];
  let index = 0;
  const jsx = (type, props) => ({ type, props });
  const dropdown = Object.fromEntries(['DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuRadioGroup', 'DropdownMenuRadioItem', 'DropdownMenuSeparator', 'DropdownMenuSub', 'DropdownMenuSubContent', 'DropdownMenuSubTrigger', 'DropdownMenuTrigger'].map(name => [name, name]));
  runInNewContext(ts.transpileModule(readFileSync('components/layout/avatar-menu.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, localStorage: { getItem: () => {
    if (storageFails) throw new Error('Storage unavailable');
    return 'user';
  } }, require: name => ({
    react: { useState: initial => { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], next => { states[i] = next; }]; } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next-themes': { useTheme: () => ({ theme: 'system', resolvedTheme: 'light' }) },
    '@/hooks/use-mounted': { useMounted: () => true },
    '@/components/ui/dropdown-menu': dropdown,
    '@/components/shared/confirm-dialog': { ConfirmDialog: 'ConfirmDialog' },
    '@/components/shared/author-avatar': { initial: () => 'U' },
    '@/lib/editor-draft': { listDrafts: () => hasDrafts ? [{}] : [], clearLocalDrafts: () => calls.push('clear') },
    '@/app/actions': { handleLogout: async () => { calls.push('logout'); } },
  })[name] ?? {} });
  const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
  const render = () => { index = 0; return flatten(exports.AvatarMenu({ username: 'user' })); };
  const selectLogout = () => render().find(node => node.type === 'DropdownMenuItem' && node.props.variant === 'destructive').props.onSelect();
  const dialog = () => render().find(node => node.type === 'ConfirmDialog').props;
  return { calls, selectLogout, dialog };
}

test('unsynced drafts survive cancelling logout and are only discarded after confirmation', () => {
  const s = setup(true);
  s.selectLogout();
  expect(s.dialog().open).toBe(true);
  expect(s.calls).toEqual([]);
  s.dialog().onOpenChange(false);
  expect(s.dialog().open).toBe(false);
  expect(s.calls).toEqual([]);
  s.selectLogout();
  s.dialog().onConfirm();
  expect(s.calls).toEqual(['clear', 'logout']);
});

test('logout without unsynced drafts needs no confirmation', () => {
  const s = setup(false);
  s.selectLogout();
  expect(s.dialog().open).toBe(false);
  expect(s.calls).toEqual(['clear', 'logout']);
});


test('unavailable local storage still prompts before logging out', () => {
  const s = setup(false, true);
  s.selectLogout();
  expect(s.dialog().open).toBe(true);
  expect(s.calls).toEqual([]);
});
