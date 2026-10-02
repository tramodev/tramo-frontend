import { test } from 'node:test';
import assert from 'node:assert/strict';
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
    assert.equal(exports.relationshipLabel(type, 'JWT', 'Tokens'), outgoing);
    assert.equal(exports.relationshipLabel(type, 'JWT', 'Tokens', true), incoming);
  }
});

test('ordering notes never reverses or creates their associations', () => {
  const association = { id: 'a', type: 'REQUIRES', targetType: 'ITEM', targetId: 'tokens', targetTitle: 'Old title' };
  const items = { jwt: { title: 'JWT', associations: [association] }, tokens: { title: 'Tokens', associations: [] } };
  for (const [previous, current] of [['tokens', 'jwt'], ['jwt', 'tokens']]) {
    const [tie] = exports.bridgeTies(items, previous, current);
    assert.equal(tie.association.targetId, 'tokens');
    assert.equal(tie.sourceTitle, 'JWT');
    assert.equal(tie.association.targetTitle, 'Tokens');
  }
  assert.equal(association.targetTitle, 'Old title');
  assert.equal(exports.bridgeTies(items, 'tokens', 'unrelated').length, 0);
});
