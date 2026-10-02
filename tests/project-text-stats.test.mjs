import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/editor-utils.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports });
const content = (text) => JSON.stringify({ root: { children: [{ children: [{ text }] }] } });

test('counts unique project items, including loose items, and updates after edits and deletion', () => {
  const items = { shared: { content: content('hello world') }, loose: { content: content('one') } };
  const count = () => JSON.parse(JSON.stringify(exports.countProjectTextStats(items)));
  assert.deepEqual(count(), { words: 3, characters: 14 });
  items.loose.content = content('one two');
  assert.deepEqual(count(), { words: 4, characters: 18 });
  delete items.shared;
  assert.deepEqual(count(), { words: 2, characters: 7 });
  assert.deepEqual(exports.countProjectTextStats({}).words, 0);
});

test('does not display a partial project count while any item is unloaded', () => {
  assert.equal(exports.countProjectTextStats({ loaded: { content: content('hello') }, pending: { content: null } }), null);
  assert.equal(exports.countProjectTextStats({ empty: { content: '' } }).words, 0);
});

test('uses backend counts without loading or parsing item bodies', () => {
  const items = {
    shared: { content: null, textStats: { words: 10, characters: 40 } },
    loose: { content: 'invalid JSON', textStats: { words: 3, characters: 12 } },
  };
  assert.equal(exports.countProjectTextStats(items).words, 13);
  items.shared.textStats = { words: 11, characters: 45 };
  assert.equal(exports.countProjectTextStats(items).words, 14);
  delete items.loose;
  assert.equal(exports.countProjectTextStats(items).characters, 45);
});
