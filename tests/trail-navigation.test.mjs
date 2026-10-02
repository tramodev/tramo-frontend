import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/trail-navigation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports });
const trails = [{ id: 'a', itemIds: ['shared', 'one'] }, { id: 'b', itemIds: ['shared', 'two'] }];
test('an explicit trail wins and shared items keep their current context', () => {
  assert.equal(exports.resolveItemTrail(trails, 'shared', 'a', 'b'), 'b');
  assert.equal(exports.resolveItemTrail(trails, 'shared', 'b'), 'b');
  assert.equal(exports.resolveItemTrail(trails, 'two', 'a'), 'b');
  assert.equal(exports.resolveItemTrail(trails, 'loose', 'a'), undefined);
});
test('visible item follows the reading line including long and empty steps', () => {
  const positions = [{ id: 'a', top: -1200 }, { id: 'b', top: 200 }, { id: 'c', top: 240 }];
  assert.equal(exports.visibleItemAtLine(positions, 100), 'a');
  assert.equal(exports.visibleItemAtLine(positions, 200), 'b');
  assert.equal(exports.visibleItemAtLine(positions, 300), 'c');
  assert.equal(exports.visibleItemAtLine(positions, -1500), 'a');
  assert.equal(exports.visibleItemAtLine([], 100), undefined);
});

test('public reading starts deterministically at the first nonempty trail without changing author order', () => {
  const input = [{ id: '10', items: ['later'] }, { id: '1', items: [] }, { id: '2', items: ['first'] }];
  assert.equal(exports.firstReadableTrail(input), input[2]);
  assert.equal(input[0].id, '10');
  assert.equal(exports.firstReadableTrail([input[0]]), input[0]);
  assert.equal(exports.firstReadableTrail([input[1]]), undefined);
  assert.equal(exports.firstReadableTrail([]), undefined);
});
