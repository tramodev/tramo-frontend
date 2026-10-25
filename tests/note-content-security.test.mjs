import { expect, test } from '@jest/globals';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const lexical = require('lexical');
const { HeadingNode } = require('@lexical/rich-text');
const { LinkNode, AutoLinkNode } = require('@lexical/link');
const modules = {};
function load(path) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => modules[name] ?? require(name) });
  return exports;
}
modules['@/app/editor/styleConfig'] = load('app/editor/styleConfig.ts');
const { sanitizeNoteStyle, sanitizeNoteContent } = load('app/editor/note-content.ts');
const text = (value, style = '') => ({ type: 'text', version: 1, text: value, detail: 0, format: 0, mode: 'normal', style });
const element = (type, children, extra = {}) => ({ type, version: 1, children, direction: null, format: '', indent: 0, ...extra });
const content = children => JSON.stringify({ root: element('root', children) });

function parse(value) {
  const editor = lexical.createEditor({ namespace: 'security-test', nodes: [HeadingNode, LinkNode, AutoLinkNode], onError: error => { throw error; } });
  editor.setEditorState(editor.parseEditorState(sanitizeNoteContent(value)));
  return editor.getEditorState();
}

test('saved CSS is restricted to existing color and font-size rules throughout the note', () => {
  const unsafe = 'position:fixed;inset:0;z-index:2147483647;background:url(https://evil.test);color:rgb(1, 2, 3);font-size:24px;background-color:rgb(4, 5, 6)';
  const original = content([element('paragraph', [text('original', unsafe)], { textStyle: unsafe })]);
  const sanitized = JSON.parse(sanitizeNoteContent(original));
  const style = 'color: rgb(1, 2, 3); font-size: 24px; background-color: rgb(4, 5, 6);';
  expect(sanitized.root.children[0].textStyle).toBe(style);
  expect(sanitized.root.children[0].children[0].style).toBe(style);
  expect(original).toContain('position:fixed');
  parse(original).read(() => {
    const node = lexical.$getRoot().getFirstChild().getFirstChild();
    expect(node.getStyle()).toBe(style);
    expect(node.getTextContent()).toBe('original');
  });
});

test.each(['color:expression(alert(1))', 'color:var(--evil)', 'font-size:999px', 'font-size:12px!important', 'background-color:url(https://evil.test)', 'c\\6flor:rgb(1, 2, 3)', 'color:rgb(1, 2, 3)/*', null, {}])('rejects unsupported CSS %j', input => {
  expect(sanitizeNoteStyle(input)).toBe('');
});

test.each(['script', 'style', 'iframe', 'object', 'img', 'svg', 'h7', null])('rejects a heading with HTML tag %j', tag => {
  expect(() => parse(content([element('heading', [text('payload')], { tag })]))).toThrow('Invalid heading tag');
});

test.each(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])('preserves a real %s heading', tag => {
  parse(content([element('heading', [text('Heading')], { tag })])).read(() => {
    expect(lexical.$getRoot().getFirstChild().getTag()).toBe(tag);
  });
});

test.each(['not json', 'null', '{}', '{"root":null}', content([]), content([element('paragraph', [{ type: 'unregistered', version: 1 }])])])('fails closed for malformed notes without replacing the content: %s', value => {
  expect(() => parse(value)).toThrow();
});

test.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:alert(1)', 'file:///etc/passwd'])('Lexical also blocks unsafe saved link %s', url => {
  parse(content([element('paragraph', [element('link', [text('link')], { url })])])).read(() => {
    const link = lexical.$getRoot().getFirstChild().getFirstChild();
    expect(link.sanitizeUrl(link.getURL())).toBe('about:blank');
  });
});

test('safe persisted styles keep their exact representation for extraction conflict checks', () => {
  const style = 'font-size: 16px;color: rgb(1, 2, 3);';
  expect(sanitizeNoteStyle(style)).toBe(style);
  const original = content([element('paragraph', [text('original', style)])]);
  expect(sanitizeNoteContent(original)).toBe(original);
});
