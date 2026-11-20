import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

function render(path, component) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, process: { env: {} }, require: name => ({
    react: { useState: initial => [initial, () => {}], useActionState: () => [null, () => {}, false], useEffect() {}, startTransition: run => run() },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({}), useSearchParams: () => new URLSearchParams('token=reset') },
    '@/lib/password-strength': { getPasswordStrength: () => ({ score: 0 }) },
    '@/lib/utils': { cn: (...args) => args.join(' ') },
  })[name] ?? {} });
  return flatten(exports[component]({}));
}

test.each([
  ['components/auth/login-form.tsx', 'LoginForm'],
  ['components/auth/signup-form.tsx', 'SignupForm'],
  ['app/(auth)/reset-password/reset-password-client.tsx', 'ResetPasswordClient'],
])('%s posts so a submit before hydration never puts credentials in the URL', (path, component) => {
  expect(render(path, component).find(node => node.type === 'form').props.method).toBe('post');
});
