import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const lexical = require('lexical');
const link = require('@lexical/link');

const jsx = (type, props, key) => ({ type, props, key });
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

function loadDemo(variant) {
  const exports = {};
  const itemLink = {};
  runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/itemLink.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: itemLink });
  const states = [];
  let index = 0;
  runInNewContext(ts.transpileModule(readFileSync('components/landing/product-editor-demo.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: name => ({
      lexical,
      '@lexical/link': link,
      react: { useState: initial => {
        const slot = index++;
        if (!(slot in states)) states[slot] = initial;
        return [states[slot], next => { states[slot] = typeof next === 'function' ? next(states[slot]) : next; }];
      } },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      '@lexical/react/LexicalComposer': { LexicalComposer: 'Composer' },
      '@lexical/react/LexicalOnChangePlugin': { OnChangePlugin: 'OnChange' },
      '@lexical/react/LexicalRichTextPlugin': { RichTextPlugin: 'RichText' },
      '@lexical/react/LexicalContentEditable': { ContentEditable: 'ContentEditable' },
      '@/components/ui/button': { Button: 'Button' },
      '@/components/ui/input': { Input: 'Input' },
      '@/app/editor/plugins/ItemMentionPlugin': { default: 'ItemMention' },
      '@/app/editor/plugins/itemLink': itemLink,
      '@/lib/utils': { cn: (...classes) => classes.filter(Boolean).join(' ') },
    })[name] ?? {},
  });
  return () => { index = 0; return flatten(exports.ProductEditorDemo({ variant })); };
}

test('edits follow a shared note across trails, survive note navigation and reset locally', () => {
  const render = loadDemo('shared');
  let nodes = render();
  const content = { root: { children: [{ text: 'My edited explanation' }] } };
  nodes.find(node => node.type === 'OnChange').props.onChange({ toJSON: () => content });
  nodes = render();
  const otherTrail = nodes.find(node => node.type === 'button' && node.props.children === 'Thinking in trails');
  otherTrail.props.onClick();
  nodes = render();
  expect(nodes.find(node => node.type === 'Composer').props.initialConfig.editorState).toBe(JSON.stringify(content));

  const linkedContent = nodes.find(node => node.type === 'div' && node.props.onClickCapture);
  linkedContent.props.onClickCapture({ target: { closest: () => ({ getAttribute: () => '#essay' }) }, preventDefault() {}, stopPropagation() {} });
  nodes = render();
  expect(nodes.find(node => node.type === 'RichText').props.contentEditable.props['aria-label']).toBe('As We May Think demo editor');
  nodes.find(node => node.props['aria-label'] === 'Open Memex').props.onClick();
  nodes = render();
  expect(nodes.find(node => node.type === 'Composer').props.initialConfig.editorState).toBe(JSON.stringify(content));

  nodes.find(node => node.props['aria-label'] === 'Reset demo').props.onClick();
  nodes = render();
  expect(typeof nodes.find(node => node.type === 'Composer').props.initialConfig.editorState).toBe('function');
  expect(nodes.find(node => node.type === 'Composer').key).toBe('memex-1');
  expect(typeof loadDemo('shared')().find(node => node.type === 'Composer').props.initialConfig.editorState).toBe('function');
});

test('the demo initializes valid Lexical content with a working local note link', () => {
  const nodes = loadDemo('connections')();
  const config = nodes.find(node => node.type === 'Composer').props.initialConfig;
  const editor = lexical.createEditor({ ...config, editorState: undefined });
  editor.update(config.editorState, { discrete: true });
  const content = editor.getEditorState().toJSON();
  expect(content.root.children).toHaveLength(3);
  expect(content.root.children[2].children[0].type).toBe('link');
  expect(content.root.children[2].children[0].url).toBe('#essay');
  expect(() => editor.parseEditorState(JSON.stringify(content))).not.toThrow();
});

test('sidebar searches notes locally without changing the selected note', () => {
  const render = loadDemo('connections');
  let nodes = render();
  nodes.find(node => node.type === 'Input').props.onChange({ target: { value: 'AS WE MAY' } });
  nodes = render();
  const sidebar = nodes.find(node => node.props['aria-label'] === 'Demo trails');
  expect(flatten(sidebar).filter(node => node.type === 'li')).toHaveLength(1);
  expect(flatten(sidebar).some(node => node.props.children === 'As We May Think')).toBe(true);
  expect(nodes.find(node => node.type === 'RichText').props.contentEditable.props['aria-label']).toBe('Memex demo editor');
});

test('the second demo replaces the left sidebar with navigable connections and no map', () => {
  const render = loadDemo('shared');
  let nodes = render();
  expect(nodes.some(node => node.props['aria-label'] === 'Demo trails')).toBe(false);
  expect(nodes.some(node => node.props['aria-label'] === 'Demo connections')).toBe(true);
  expect(nodes.some(node => node.props['aria-label'] === 'Open map')).toBe(false);
  nodes.find(node => node.props['aria-label'] === 'Open As We May Think').props.onClick();
  nodes = render();
  expect(nodes.find(node => node.type === 'RichText').props.contentEditable.props['aria-label']).toBe('As We May Think demo editor');
});

test('Sharing a trail to Memex handles links before editor focus and click updates', () => {
  const render = loadDemo('shared');
  let nodes = render();
  nodes.find(node => node.props['aria-label'] === 'Open Sharing a trail').props.onClick();
  nodes = render();
  const content = nodes.find(node => node.type === 'div' && node.props.onClickCapture);
  let prevented = 0, stopped = 0;
  const target = { closest: () => ({ getAttribute: attribute => attribute === 'href' ? '#memex' : '' }) };
  content.props.onMouseDownCapture({ target, preventDefault() { prevented++; } });
  content.props.onClickCapture({ target, preventDefault() { prevented++; }, stopPropagation() { stopped++; } });
  expect(prevented).toBe(2);
  expect(stopped).toBe(1);
  expect(render().find(node => node.type === 'RichText').props.contentEditable.props['aria-label']).toBe('Memex demo editor');
  content.props.onMouseDownCapture({ target: { closest: () => null }, preventDefault() { throw new Error('Normal editing must keep focus'); } });
});

test('mentions offer only demo notes and their app-style links navigate inside the demo', () => {
  const render = loadDemo('connections');
  let nodes = render();
  const mention = nodes.find(node => node.type === 'ItemMention');
  expect(mention.props.currentItemId).toBe('memex');
  expect(Object.values(mention.props.items).map(note => note.title)).toEqual(['Vannevar Bush', 'As We May Think', 'Memex', 'Associative trails', 'Sharing a trail']);
  nodes.find(node => node.type === 'div' && node.props.onClickCapture).props.onClickCapture({
    target: { closest: () => ({ getAttribute: attribute => attribute === 'rel' ? 'tramo-idea:trails' : '#' }) },
    preventDefault() {}, stopPropagation() {},
  });
  nodes = render();
  expect(nodes.find(node => node.type === 'RichText').props.contentEditable.props['aria-label']).toBe('Associative trails demo editor');
});

test('connections navigate locally and pasted external links cannot navigate away', () => {
  const render = loadDemo('connections');
  let nodes = render();
  expect(nodes.some(node => node.props['aria-label'] === 'Demo connections')).toBe(false);
  expect(nodes.some(node => node.props['aria-expanded'] !== undefined)).toBe(false);
  nodes.find(node => node.type === 'div' && node.props.onClickCapture).props.onClickCapture({
    target: { closest: () => ({ getAttribute: () => '#essay' }) },
    preventDefault() {}, stopPropagation() {},
  });
  nodes = render();
  expect(nodes.find(node => node.type === 'RichText').props.contentEditable.props['aria-label']).toBe('As We May Think demo editor');
  let prevented = false;
  nodes.find(node => node.type === 'div' && node.props.onClickCapture).props.onClickCapture({
    target: { closest: () => ({ getAttribute: () => 'https://example.com' }) },
    preventDefault() { prevented = true; }, stopPropagation() {},
  });
  expect(prevented).toBe(true);
  expect(render().find(node => node.type === 'RichText').props.contentEditable.props['aria-label']).toBe('As We May Think demo editor');
});
