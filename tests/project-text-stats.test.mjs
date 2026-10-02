import { expect, test } from '@jest/globals';
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
  expect(count()).toStrictEqual({ words: 3, characters: 14 });
  items.loose.content = content('one two');
  expect(count()).toStrictEqual({ words: 4, characters: 18 });
  delete items.shared;
  expect(count()).toStrictEqual({ words: 2, characters: 7 });
  expect(exports.countProjectTextStats({}).words).toStrictEqual(0);
});

test('does not display a partial project count while any item is unloaded', () => {
  expect(exports.countProjectTextStats({ loaded: { content: content('hello') }, pending: { content: null } })).toBe(null);
  expect(exports.countProjectTextStats({ empty: { content: '' } }).words).toBe(0);
});

test('uses backend counts without loading or parsing item bodies', () => {
  const items = {
    shared: { content: null, textStats: { words: 10, characters: 40 } },
    loose: { content: 'invalid JSON', textStats: { words: 3, characters: 12 } },
  };
  expect(exports.countProjectTextStats(items).words).toBe(13);
  items.shared.textStats = { words: 11, characters: 45 };
  expect(exports.countProjectTextStats(items).words).toBe(14);
  delete items.loose;
  expect(exports.countProjectTextStats(items).characters).toBe(45);
});
