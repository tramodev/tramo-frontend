import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync('lib/lexical-diff.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, JSON });

const text = (value, format = 0) => ({ type: 'text', text: value, format, style: '', mode: 'normal', detail: 0, version: 1 });
const paragraph = (...children) => ({ type: 'paragraph', children, version: 1 });
const note = (...children) => JSON.stringify({ root: { type: 'root', children, version: 1 } });
const blocks = content => JSON.parse(content).root.children;

test('unchanged content is returned without marks', () => {
  const content = note(paragraph(text('same')));
  expect(exports.diffNoteContent(content, content)).toBe(content);
});

test('added and removed blocks are highlighted and struck through keeping their formatting', () => {
  const result = blocks(exports.diffNoteContent(note(paragraph(text('gone', 1))), note({ type: 'image', src: 'x' }, paragraph(text('kept')))));
  expect(result.map(block => block.type)).toEqual(['paragraph', 'image', 'paragraph']);
  expect(result[0].children[0].format).toBe(1 | 4);
  expect(result[2].children[0].format).toBe(128);
});

test('changed words inside a paragraph are marked individually', () => {
  const [block] = blocks(exports.diffNoteContent(note(paragraph(text('the quick fox'))), note(paragraph(text('the slow fox')))));
  expect(block.children.map(child => [child.text, child.format])).toEqual([['the ', 0], ['quick', 4], ['slow', 128], [' fox', 0]]);
});

test('nested lists diff their items instead of replacing the whole list', () => {
  const list = (...items) => ({ type: 'list', children: items.map(value => ({ type: 'listitem', children: [text(value)] })) });
  const [block] = blocks(exports.diffNoteContent(note(list('a', 'b')), note(list('a', 'c'))));
  expect(block.children[0].children[0].format).toBe(0);
  expect(block.children[1].children.map(child => child.format)).toEqual([4, 128]);
});

test('a note absent from the base version is fully highlighted and broken content falls back', () => {
  expect(blocks(exports.diffNoteContent(null, note(paragraph(text('new')))))[0].children[0].format).toBe(128);
  expect(exports.diffNoteContent(note(), 'not json')).toBe('not json');
});
