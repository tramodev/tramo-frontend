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
