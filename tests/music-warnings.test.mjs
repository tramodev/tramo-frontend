import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { parseOnly } = require('abcjs');
const validity = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/embed-validity.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: validity, require: () => ({}) });
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/MusicComponent.tsx', 'utf8') + '\nexport { plainMusicWarning, renderScore };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: name => name === '@/app/editor/embed-validity' ? validity : {} });
const { plainMusicWarning, renderScore } = exports;

test('actual ABC parser warnings display their position and character without span markup', () => {
  const [tune] = parseOnly('X:1\nK:C\n?');
  expect(tune.warnings).toHaveLength(1);
  expect(plainMusicWarning(tune.warnings[0])).toBe('Music Line:3:1: Unknown character ignored: ?');
});

test('encoded user notation stays literal text and is decoded only once', () => {
  expect(plainMusicWarning('Error: <span style="font-weight:bold">&lt;span&gt;x&lt;/span&gt; &amp;lt;</span>'))
    .toBe('Error: <span>x</span> &lt;');
  expect(plainMusicWarning('Error: <span style="font-weight:bold">&</span>lt;')).toBe('Error: &lt;');
});

test('a raw angle bracket highlighted by ABC remains part of the warning', () => {
  const [tune] = parseOnly('X:1\nK:C\n<');
  expect(plainMusicWarning(tune.warnings[0])).toBe('Music Line:3:1: Unknown character ignored: <');
});

test('unknown-character warnings show only the ignored character, not the surrounding valid notes', () => {
  const [tune] = parseOnly('X:1\nK:C\nC D ? E F');
  expect(tune.warnings.map(plainMusicWarning)).toEqual(['Music Line:3:5: Unknown character ignored: ?']);
});

test('each ignored character has its own warning and position', () => {
  const [tune] = parseOnly('X:1\nK:C\n? @');
  expect(tune.warnings.map(plainMusicWarning)).toEqual([
    'Music Line:3:1: Unknown character ignored: ?',
    'Music Line:3:3: Unknown character ignored: @',
  ]);
});


test('rendered scores expose parser warnings as plain text', () => {
  const abc = 'X:1\nK:C\nC D ? E F';
  const warnings = renderScore({
    tuneMetrics: () => [],
    renderAbc: () => parseOnly(abc),
  }, { querySelectorAll: () => [], querySelector: () => null }, abc);
  expect(warnings).toEqual(['Music Line:3:5: Unknown character ignored: ?']);
});

test('the reported invalid example contains a valid ABC comment', () => {
  expect(parseOnly('X:1\nK:C\nc2 &%$ zz ]]')[0].warnings ?? []).toEqual([]);
});
