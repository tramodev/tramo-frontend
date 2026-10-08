// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/associations.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports, require: () => ({}) });

test('connection counts include both directions independently of trails', () => {
  const items = {
    a: { id: 'a', associations: [{ id: 'ab', targetId: 'b', text: 'Context' }] },
    b: { id: 'b', associations: [{ id: 'ba', targetId: 'a', text: null }] },
    c: { id: 'c', associations: [] },
  };
  const counts = exports.connectionCounts(items);
  expect(counts.get('a')).toBe(2);
  expect(counts.get('b')).toBe(2);
  expect(counts.get('c')).toBe(0);
  expect(items.a.associations[0].text).toBe('Context');
});
