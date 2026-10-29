import { expect, test } from '@jest/globals';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { TextEncoder } from 'node:util';
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
  }).outputText, { exports, TextEncoder, URL, require: name => modules[name] ?? require(name) });
  return exports;
}
modules['@/app/editor/styleConfig'] = load('app/editor/styleConfig.ts');
const { sanitizeNoteStyle, sanitizeNoteContent, isLegacyNoteContent } = load('app/editor/note-content.ts');
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

test.each(['not json', 'null', '{}', '{"root":null}', content([element('paragraph', [{ type: 'unregistered', version: 1 }])])])('fails closed for malformed notes without replacing the content: %s', value => {
  expect(() => parse(value)).toThrow();
});

test.each([content([]), '{"root":{"type":"root","children":[]}}'])('opens an empty root as an editable empty paragraph: %s', value => {
  const state = parse(value);
  state.read(() => {
    expect(lexical.$getRoot().getChildrenSize()).toBe(1);
    expect(lexical.$isParagraphNode(lexical.$getRoot().getFirstChild())).toBe(true);
    expect(lexical.$getRoot().getTextContent()).toBe('');
  });
  expect(state.isEmpty()).toBe(false);
  expect(JSON.parse(sanitizeNoteContent(JSON.stringify(state.toJSON())))).toEqual(state.toJSON());
});

test.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:alert(1)', 'file:///etc/passwd'])('an unsafe saved link becomes text without losing the note: %s', url => {
  parse(content([element('paragraph', [element('link', [text('link')], { url })])])).read(() => {
    const child = lexical.$getRoot().getFirstChild().getFirstChild();
    expect(lexical.$isTextNode(child)).toBe(true);
    expect(child.getTextContent()).toBe('link');
  });
});

test('safe persisted styles keep their exact representation for extraction conflict checks', () => {
  const style = 'font-size: 16px;color: rgb(1, 2, 3);';
  expect(sanitizeNoteStyle(style)).toBe(style);
  const original = content([element('paragraph', [text('original', style)])]);
  expect(sanitizeNoteContent(original)).toBe(original);
});


test('stored oversized equations remain readable and are marked as legacy', () => {
  const accepted = content([{ type: 'equation', equation: 'x'.repeat(10000) }]);
  const legacy = content([{ type: 'equation', equation: 'x'.repeat(10001) }]);
  expect(isLegacyNoteContent(accepted)).toBe(false);
  expect(isLegacyNoteContent(legacy)).toBe(true);
  expect(() => sanitizeNoteContent(legacy)).not.toThrow();
});


test.each(['equation', 'music'])('%s source outside current limits is marked as legacy', type => {
  const field = type === 'equation' ? 'equation' : 'abc';
  for (const source of [null, 42, {}, [], 'x'.repeat(10001), '😀'.repeat(5001)]) {
    expect(isLegacyNoteContent(content([{ type, [field]: source }]))).toBe(true);
  }
  for (const source of ['x'.repeat(10000), '😀'.repeat(5000)]) {
    expect(isLegacyNoteContent(content([{ type, [field]: source }]))).toBe(false);
  }
});

test('stored unsafe styles and embeds are marked as legacy', () => {
  expect(isLegacyNoteContent(content([text('unsafe', 'color: url(javascript:alert(1))')]))).toBe(true);
  expect(isLegacyNoteContent(content([{ type: 'embed', provider: 'youtube', id: 'dQw4w9WgXcQ', src: 'https://evil.test' }]))).toBe(true);
  expect(isLegacyNoteContent(content([{ type: 'embed', provider: 'youtube', id: 'dQw4w9WgXcQ' }]))).toBe(false);
});
