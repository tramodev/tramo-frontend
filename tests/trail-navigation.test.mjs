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

test('public reading starts deterministically at the first nonempty trail without changing author order', () => {
  const input = [{ id: '10', items: ['later'] }, { id: '1', items: [] }, { id: '2', items: ['first'] }];
  expect(exports.firstReadableTrail(input)).toBe(input[2]);
  expect(input[0].id).toBe('10');
  expect(exports.firstReadableTrail([input[0]])).toBe(input[0]);
  expect(exports.firstReadableTrail([input[1]])).toBe(undefined);
  expect(exports.firstReadableTrail([])).toBe(undefined);
});

test('only annotated steps whose predecessor changes need review, including the first step', () => {
  const steps = [{ itemId: 'a', annotation: null }, { itemId: 'b', annotation: 'Because A follows' }, { itemId: 'c', annotation: '  ' }];
  expect(Array.from(exports.annotationsToReview(steps, ['a', 'b', 'c']))).toEqual([]);
  expect(Array.from(exports.annotationsToReview(steps, ['a', 'c', 'b']))).toEqual(['b']);
  expect(Array.from(exports.annotationsToReview(steps, ['b', 'a', 'c']))).toEqual(['b']);
  expect(steps[1].annotation).toBe('Because A follows');
});
