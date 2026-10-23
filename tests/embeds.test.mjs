import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const lexical = require('lexical');
const code = require('@lexical/code');
const modules = {};
function load(path, overrides = {}, globals = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, URL, require: name => overrides[name] ?? modules[name] ?? require(name), ...globals });
  return exports;
}
modules['@/app/editor/plugins/embed'] = load('app/editor/plugins/embed.ts');
modules['@/app/editor/nodes/EmbedNode'] = load('app/editor/nodes/EmbedNode.tsx', {}, {
  document: { createElement: () => {
    const attributes = new Map();
    return { setAttribute: (name, value) => attributes.set(name, value), getAttribute: name => attributes.get(name) ?? null, textContent: '' };
  } },
});
modules['@/app/editor/plugins/codeBlockGuard'] = load('app/editor/plugins/codeBlockGuard.ts');
const { parseEmbedUrl, validateEmbed } = modules['@/app/editor/plugins/embed'];
const { EmbedNode, $createEmbedNode } = modules['@/app/editor/nodes/EmbedNode'];
const config = { namespace: 'test', nodes: [EmbedNode, code.CodeNode], onError: error => { throw error; } };

test.each([
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30',
  'https://youtu.be/dQw4w9WgXcQ?si=tracking',
  'https://youtube.com/shorts/dQw4w9WgXcQ',
  'https://m.youtube.com/live/dQw4w9WgXcQ',
  'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
])('accepts a YouTube video URL: %s', url => {
  expect(parseEmbedUrl(url)).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ' });
});

test.each([
  'https://x.com/user/status/123456789?ref=tracking',
  'https://twitter.com/user/status/123456789',
  'https://mobile.twitter.com/user/status/123456789/photo/1',
  'https://x.com/i/web/status/123456789',
  'https://x.com/i/status/123456789',
])('accepts a tweet URL: %s', url => {
  expect(parseEmbedUrl(url)).toEqual({ provider: 'tweet', id: '123456789' });
});

test.each([
  'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>',
  'http://youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
  'https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ',
  'https://user:password@youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com:8443/watch?v=dQw4w9WgXcQ',
  'https://youtube.com/watch?v=invalid', 'https://youtube.com/playlist?list=anything',
  'https://x.com/user', 'https://x.com/user/status/0', 'https://x.com/user/status/123456789/evil',
  'https://vimeo.com/123456789', 'not a URL',
])('rejects unsupported or unsafe URLs: %s', url => {
  expect(parseEmbedUrl(url)).toBeNull();
});

test('IDs are validated independently of URLs', () => {
  expect(validateEmbed('tweet', 123)).toBeNull();
  expect(validateEmbed('tweet', '1'.repeat(21))).toBeNull();
  expect(validateEmbed('youtube', '../anything')).toBeNull();
  expect(validateEmbed('unknown', 'dQw4w9WgXcQ')).toBeNull();
});

test.each(['youtube', 'tweet'])('%s survives JSON reload with its alignment and a safe iframe', provider => {
  const embed = { provider, id: provider === 'youtube' ? 'dQw4w9WgXcQ' : '123456789' };
  const editor = lexical.createEditor(config);
  editor.update(() => lexical.$getRoot().append($createEmbedNode(embed).setFormat('center')), { discrete: true });
  const content = JSON.stringify(editor.getEditorState().toJSON());
  const reader = lexical.createEditor(config);
  reader.setEditorState(reader.parseEditorState(content));
  reader.getEditorState().read(() => {
    const node = lexical.$getRoot().getFirstChild();
    expect(node.exportJSON()).toMatchObject({ ...embed, type: 'embed', format: 'center' });
    const [iframe, link] = node.decorate().props.children;
    expect(iframe.type).toBe('iframe');
    expect(new URL(iframe.props.src).hostname).toBe(provider === 'youtube' ? 'www.youtube-nocookie.com' : 'platform.twitter.com');
    expect(iframe.props.referrerPolicy).toBe('strict-origin-when-cross-origin');
    expect(iframe.props.sandbox).not.toContain('allow-top-navigation');
    expect(link.props.href).toBe(node.getTextContent());
  });
});

test('malformed saved IDs cannot create an iframe or arbitrary URL', () => {
  const editor = lexical.createEditor(config);
  editor.update(() => {
    for (const provider of ['youtube', 'tweet', 'evil']) {
      const node = EmbedNode.importJSON({ provider, id: 'https://evil.test', type: 'embed', version: 1 });
      lexical.$getRoot().append(node);
      expect(node.getTextContent()).toBe('');
      expect(node.decorate().type).toBe('p');
    }
  }, { discrete: true });
});

test('HTML copy/export round-trips the embed and rejects forged IDs', () => {
  const editor = lexical.createEditor(config);
  editor.update(() => {
    const node = $createEmbedNode({ provider: 'tweet', id: '123456789' });
    lexical.$getRoot().append(node);
    const { element } = node.exportDOM();
    expect(element.textContent).toBe('https://x.com/i/web/status/123456789');
    const importer = EmbedNode.importDOM().div(element);
    expect(importer.conversion(element).node.exportJSON()).toMatchObject({ provider: 'tweet', id: '123456789' });
    element.setAttribute('data-tramo-embed-id', '../evil');
    expect(EmbedNode.importDOM().div(element)).toBeNull();
  }, { discrete: true });
});

function pluginSetup(inCode = false) {
  const editor = lexical.createEditor(config);
  editor.update(() => {
    const block = inCode ? code.$createCodeNode() : lexical.$createParagraphNode();
    lexical.$getRoot().append(block.append(lexical.$createTextNode('beforeafter')));
    block.getFirstChild().select(6, 6);
  }, { discrete: true });
  const states = [], effects = [], frames = [];
  const selectionRef = { current: null };
  let index = 0, mounted = false;
  const ui = {};
  for (const name of ['Dialog', 'DialogContent', 'DialogDescription', 'DialogHeader', 'DialogTitle', 'Button', 'Input']) ui[name] = name;
  const plugin = load('app/editor/plugins/EmbedsPlugin.tsx', {
    react: { useState: initial => { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; }, useRef: () => selectionRef, useEffect: effect => { if (!mounted) effects.push(effect); } },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [editor] },
    '@/components/ui/button': ui, '@/components/ui/input': ui, '@/components/ui/dialog': ui,
  }, { requestAnimationFrame: fn => frames.push(fn) });
  const flatten = element => Array.isArray(element) ? element.flatMap(flatten) : element?.props ? [element, ...flatten(element.props.children)] : [];
  function render() {
    index = 0;
    const nodes = flatten(plugin.default());
    if (!mounted) { mounted = true; effects.forEach(effect => effect()); }
    return nodes;
  }
  render();
  function command(command, payload) { editor.update(() => editor.dispatchCommand(command, payload), { discrete: true }); }
  return { editor, plugin, render, frames, command, open: () => command(plugin.OPEN_EMBED_DIALOG_COMMAND),
    enter: url => render().find(node => node.type === 'Input').props.onChange({ target: { value: url } }),
    submit: () => render().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }) };
}

test('dialog inserts at the captured caret, preserving text and leaving editable content after the embed', () => {
  const s = pluginSetup();
  s.open();
  s.enter('https://youtu.be/dQw4w9WgXcQ');
  s.editor.update(() => lexical.$getRoot().getFirstDescendant().select(0, 0), { discrete: true });
  s.submit();
  const children = s.editor.getEditorState().toJSON().root.children;
  expect(children.map(node => node.type)).toEqual(['paragraph', 'embed', 'paragraph']);
  expect(children[0].children[0].text).toBe('before');
  expect(children[2].children[0].text).toBe('after');
  expect(s.render().find(node => node.type === 'Dialog').props.open).toBe(false);
});

test('cancel and invalid URLs preserve the document', () => {
  const s = pluginSetup();
  const before = s.editor.getEditorState().toJSON();
  s.open(); s.enter('https://evil.test/video'); s.submit();
  expect(s.render().find(node => node.props.role === 'alert')).toBeDefined();
  expect(s.render().find(node => node.type === 'Dialog').props.open).toBe(true);
  s.render().find(node => node.type === 'Button' && node.props.children === 'Cancel').props.onClick();
  expect(s.editor.getEditorState().toJSON()).toEqual(before);
});

test('insertion at the end creates a trailing paragraph and invalid command payloads are ignored', () => {
  const s = pluginSetup();
  s.editor.update(() => lexical.$getRoot().selectEnd(), { discrete: true });
  s.command(s.plugin.INSERT_EMBED_COMMAND, { provider: 'tweet', id: '123456789' });
  const before = s.editor.getEditorState().toJSON();
  expect(before.root.children.at(-1).type).toBe('paragraph');
  expect(before.root.children.at(-1).children).toEqual([]);
  s.command(s.plugin.INSERT_EMBED_COMMAND, { provider: 'youtube', id: '../anything' });
  expect(s.editor.getEditorState().toJSON()).toEqual(before);
});

test('code blocks and read-only editors reject embed insertion', () => {
  for (const inCode of [true, false]) {
    const s = pluginSetup(inCode);
    if (!inCode) s.editor.setEditable(false);
    const before = s.editor.getEditorState().toJSON();
    s.open();
    expect(s.render().find(node => node.type === 'Dialog').props.open).toBe(false);
    s.command(s.plugin.INSERT_EMBED_COMMAND, { provider: 'tweet', id: '123456789' });
    expect(s.editor.getEditorState().toJSON()).toEqual(before);
  }
});

test('selected embeds can be deleted without deleting surrounding text', () => {
  const s = pluginSetup();
  s.command(s.plugin.INSERT_EMBED_COMMAND, { provider: 'tweet', id: '123456789' });
  const unregister = require('@lexical/rich-text').registerRichText(s.editor);
  s.editor.update(() => {
    const node = lexical.$getRoot().getChildren().find(node => node.getType() === 'embed');
    const selection = lexical.$createNodeSelection();
    selection.add(node.getKey());
    lexical.$setSelection(selection);
    s.editor.dispatchCommand(lexical.KEY_DELETE_COMMAND, { preventDefault() {} });
  }, { discrete: true });
  const children = s.editor.getEditorState().toJSON().root.children;
  expect(children.every(node => node.type === 'paragraph')).toBe(true);
  expect(children.flatMap(node => node.children).map(node => node.text).join('')).toBe('beforeafter');
  unregister();
});

test('editor/public registrations and CSP include embeds without allowing external parent scripts', () => {
  expect(readFileSync('app/editor/lexical-config.ts', 'utf8')).toMatch(/\bEmbedNode,/);
  expect(readFileSync('components/project/lexical-read-only.tsx', 'utf8')).toMatch(/\.\.\.editorConfig/);
  const next = load('next.config.ts', {}, { process: { env: {} } }).default;
  return next.headers().then(headers => {
    const csp = headers[0].headers.find(header => header.key === 'Content-Security-Policy').value;
    const frame = csp.split('; ').find(rule => rule.startsWith('frame-src '));
    const script = csp.split('; ').find(rule => rule.startsWith('script-src '));
    expect(frame).toContain('https://www.youtube-nocookie.com https://platform.twitter.com');
    expect(script).not.toContain('twitter');
    expect(script).not.toContain('youtube');
  });
});


test('selecting /youtube captures the caret after removing the slash query', () => {
  const s = pluginSetup();
  s.editor.update(() => {
    const text = lexical.$getRoot().getFirstDescendant();
    text.setTextContent('/youtube');
    text.selectEnd();
  }, { discrete: true });
  const slash = load('app/editor/plugins/SlashMenuPlugin.tsx', {
    react: { useState: () => ['youtube', () => {}], useRef: value => ({ current: value }), useMemo: fn => fn(), useCallback: fn => fn, useEffect: fn => fn() },
    '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [s.editor] },
    '@lexical/react/LexicalTypeaheadMenuPlugin': { LexicalTypeaheadMenuPlugin: 'Typeahead', MenuOption: class {}, useBasicTypeaheadTriggerMatch: () => () => null },
    './ImagesPlugin': {}, './EquationsPlugin': {}, './MusicPlugin': {},
    '@/app/editor/plugins/EmbedsPlugin': s.plugin,
  });
  const menu = slash.default().props.children.find(node => node.type === 'Typeahead').props;
  expect(menu.options).toHaveLength(1);
  expect(menu.options[0].label).toBe('Embed');
  s.editor.update(() => {
    menu.onSelectOption(menu.options[0], lexical.$getRoot().getFirstDescendant(), () => {});
  }, { discrete: true });
  expect(s.render().find(node => node.type === 'Dialog').props.open).toBe(true);
  s.enter('https://youtu.be/dQw4w9WgXcQ');
  s.submit();
  const children = s.editor.getEditorState().toJSON().root.children;
  expect(children.some(node => node.type === 'embed' && node.id === 'dQw4w9WgXcQ')).toBe(true);
  expect(children.flatMap(node => node.children ?? []).some(node => node.text?.includes('/youtube'))).toBe(false);
});
