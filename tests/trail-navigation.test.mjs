// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/trail-navigation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports });
const trails = [{ id: 'a', itemIds: ['shared', 'one'] }, { id: 'b', itemIds: ['shared', 'two'] }];
test('an explicit trail wins and shared items keep their current context', () => {
  expect(exports.resolveItemTrail(trails, 'shared', 'a', 'b')).toBe('b');
  expect(exports.resolveItemTrail(trails, 'shared', 'b')).toBe('b');
  expect(exports.resolveItemTrail(trails, 'two', 'a')).toBe('b');
  expect(exports.resolveItemTrail(trails, 'loose', 'a')).toBe(undefined);
});
test('visible item follows the reading line including long and empty steps', () => {
  const positions = [{ id: 'a', top: -1200 }, { id: 'b', top: 200 }, { id: 'c', top: 240 }];
  expect(exports.visibleItemAtLine(positions, 100)).toBe('a');
  expect(exports.visibleItemAtLine(positions, 200)).toBe('b');
  expect(exports.visibleItemAtLine(positions, 300)).toBe('c');
  expect(exports.visibleItemAtLine(positions, -1500)).toBe('a');
  expect(exports.visibleItemAtLine([], 100)).toBe(undefined);
});
