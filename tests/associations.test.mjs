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

test('incoming relationships retain the source and stored meaning for every type', () => {
  const cases = [
    ['REQUIRES', 'JWT requires Tokens', 'Tokens is required by JWT'],
    ['ELABORATES', 'JWT elaborates on Tokens', 'Tokens is elaborated on by JWT'],
    ['CONTRADICTS', 'JWT contradicts Tokens', 'Tokens contradicts JWT'],
    ['EXAMPLE_OF', 'JWT is an example of Tokens', 'Tokens has an example in JWT'],
    ['RELATED', 'JWT is related to Tokens', 'Tokens is related to JWT'],
  ];
  for (const [type, outgoing, incoming] of cases) {
    expect(exports.relationshipLabel(type, 'JWT', 'Tokens')).toBe(outgoing);
    expect(exports.relationshipLabel(type, 'JWT', 'Tokens', true)).toBe(incoming);
  }
});

test('ordering notes never reverses or creates their associations', () => {
  const association = { id: 'a', type: 'REQUIRES', targetType: 'ITEM', targetId: 'tokens', targetTitle: 'Old title' };
  const items = { jwt: { title: 'JWT', associations: [association] }, tokens: { title: 'Tokens', associations: [] } };
  for (const [previous, current] of [['tokens', 'jwt'], ['jwt', 'tokens']]) {
    const [tie] = exports.bridgeTies(items, previous, current);
    expect(tie.association.targetId).toBe('tokens');
    expect(tie.sourceTitle).toBe('JWT');
    expect(tie.association.targetTitle).toBe('Tokens');
  }
  expect(association.targetTitle).toBe('Old title');
  expect(exports.bridgeTies(items, 'tokens', 'unrelated').length).toBe(0);
});

test('moving a note removes only its transition label, while keeping connections in both directions', () => {
  const association = { id: 'ab', type: 'RELATED', targetType: 'ITEM', targetId: 'b', targetTitle: 'B' };
  const items = { a: { id: 'a', title: 'A', associations: [association] }, b: { id: 'b', title: 'B', associations: [] }, c: { id: 'c', title: 'C', associations: [] } };
  expect(exports.bridgeTies(items, 'a', 'b')).toHaveLength(1);
  expect(exports.bridgeTies(items, 'c', 'b')).toHaveLength(0);
  expect(exports.bridgeTies(items, 'b', 'a')).toHaveLength(1);
  expect(exports.connectionCounts(items).get('a')).toBe(1);
  expect(exports.connectionCounts(items).get('b')).toBe(1);
  expect(exports.connectionCounts(items).get('c')).toBe(0);
  expect(items.a.associations[0]).toBe(association);
});

test('connection counts include trail destinations and only incoming sources loaded in the project', () => {
  const items = { a: { id: 'a', associations: [{ targetType: 'TRAIL', targetId: 'trail' }, { targetType: 'ITEM', targetId: 'outside' }] }, b: { id: 'b', associations: [{ targetType: 'ITEM', targetId: 'a' }] } };
  const counts = exports.connectionCounts(items);
  expect(counts.get('a')).toBe(3);
  expect(counts.get('b')).toBe(1);
  expect(counts.has('outside')).toBe(false);
});
