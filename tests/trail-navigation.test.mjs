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
