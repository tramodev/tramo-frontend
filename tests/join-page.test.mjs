import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function load(getSharedProject) {
  const exports = {};
  const calls = [];
  runInNewContext(ts.transpileModule(readFileSync('app/join/[[...token]]/page.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: name => name === 'react' ? { cache: fn => fn } : name === '@/lib/public-project' ? { getSharedProject: async token => { calls.push(token); return getSharedProject(token); } } : {},
  });
  return { page: exports, calls };
}
const metadataFor = (page, token) => page.generateMetadata({ params: Promise.resolve({ token: token ? [token] : undefined }) });

test('share link previews show the project the link can read and stay out of search', async () => {
  const { page, calls } = load(async () => ({ title: 'Mis notas del cosmere', description: 'Notas del cosmere', ownerUsername: 'eze' }));
  const metadata = await metadataFor(page, 'token-1');
  expect(calls).toEqual(['token-1']);
  expect(metadata.title).toBe('Mis notas del cosmere');
  expect(metadata.description).toBe('Notas del cosmere');
  expect(metadata.openGraph.title).toBe('Mis notas del cosmere');
  expect(metadata.twitter.title).toBe('Mis notas del cosmere');
  expect(metadata.robots).toEqual({ index: false, follow: false });
});

test('links that need sign-in or are invalid keep the generic preview', async () => {
  const { page } = load(async () => null);
  for (const token of ['editor-token', undefined]) {
    const metadata = await metadataFor(page, token);
    expect(metadata.title).toBe('Shared project');
    expect(metadata.description).toBeUndefined();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  }
});
