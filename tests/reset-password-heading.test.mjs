import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

function render(token, success = false) {
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  let state = 0;
  runInNewContext(ts.transpileModule(readFileSync('app/(auth)/reset-password/reset-password-client.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: name => ({
      react: { useEffect() {}, useState: initial => [state++ === 4 ? success : initial, () => {}] },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'next/navigation': { useRouter: () => ({}), useSearchParams: () => ({ get: () => token }) },
      '@/lib/utils': { cn: value => value },
      '@/lib/password-strength': { getPasswordStrength: () => ({}) },
    })[name] ?? {},
  });
  return flatten(exports.ResetPasswordClient());
}

test.each([[null, false], ['', false], ['token', false], ['token', true]])('reset password has one main heading with token %s and success %s', (token, success) => {
  const headings = render(token, success).filter(node => node.type === 'h1');
  expect(headings).toHaveLength(1);
  expect(headings[0].props.children).toBe('Reset password');
});
