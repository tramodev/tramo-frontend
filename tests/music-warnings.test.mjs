import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { parseOnly } = require('abcjs');
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/MusicComponent.tsx', 'utf8') + '\nexport { plainMusicWarning };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: () => ({}) });
const { plainMusicWarning } = exports;

test('actual ABC parser warnings display their position and character without span markup', () => {
  const [tune] = parseOnly('X:1\nK:C\n?');
  expect(tune.warnings).toHaveLength(1);
  expect(plainMusicWarning(tune.warnings[0])).toBe('Music Line:3:1: Unknown character ignored:  ?');
});

test('encoded user notation stays literal text and is decoded only once', () => {
  expect(plainMusicWarning('Error: <span style="font-weight:bold">&lt;span&gt;x&lt;/span&gt; &amp;lt;</span>'))
    .toBe('Error: <span>x</span> &lt;');
  expect(plainMusicWarning('Error: <span style="font-weight:bold">&</span>lt;')).toBe('Error: &lt;');
});

test('a raw angle bracket highlighted by ABC remains part of the warning', () => {
  const [tune] = parseOnly('X:1\nK:C\n<');
  expect(plainMusicWarning(tune.warnings[0])).toBe('Music Line:3:1: Unknown character ignored:  <');
});
