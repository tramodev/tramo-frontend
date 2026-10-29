import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const katex = require('katex');
const abcjs = require('abcjs');
function load(path, modules = {}, suffix = '') {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(path, 'utf8') + suffix, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, Error, TextEncoder, require: name => modules[name] ?? require(name) });
  return exports;
}
function validity(renderer = katex, loader = () => Promise.resolve(abcjs)) {
  return load('app/editor/embed-validity.ts', {
    katex: { default: renderer }, '@/app/editor/plugins/music-audio': { loadAbcjs: loader },
  });
}
const errors = validity();

test('valid and invalid syntax use shared renderer settings', async () => {
  expect(errors.equationError('x + y')).toBeNull();
  expect(errors.equationError('\\frac{1}{')).toBeTruthy();
  expect(await errors.musicError('X:1\nK:C\nCDEF|')).toBeNull();
  expect(await errors.musicError('X:1\nK:C\nCDE [')).toBeTruthy();
  expect(await errors.musicError('X:1\nK:C\n')).toBeTruthy();
  expect(errors.KATEX_OPTS).toMatchObject({ trust: false, throwOnError: true, maxExpand: 1000, maxSize: 50 });
});

test.each(['\\href{javascript:alert(1)}{x}', '\\url{javascript:alert(1)}', '\\htmlClass{evil}{x}', '\\def\\a{\\a\\a}\\a', 'x^{'.repeat(3000)])('unsafe or pathological math remains safe: %s', source => {
  const error = errors.equationError(source);
  if (!error) {
    const html = katex.renderToString(source, errors.KATEX_OPTS);
    expect(html).not.toMatch(/href="javascript:|class="evil"/);
  }
  expect(source).toBeTruthy();
});

test('math and ABC caches are bounded and keep recently used entries', async () => {
  let mathCalls = 0, musicCalls = 0;
  const cached = validity({ renderToString: () => { mathCalls++; } }, async () => ({ parseOnly: () => { musicCalls++; return [{ lines: [{}] }]; } }));
  for (let i = 0; i < 200; i++) { cached.equationError(String(i)); await cached.musicError(String(i)); }
  cached.equationError('0'); await cached.musicError('0');
  cached.equationError('new'); await cached.musicError('new');
  cached.equationError('0'); await cached.musicError('0');
  expect(mathCalls).toBe(201);
  expect(musicCalls).toBe(201);
  cached.equationError('1'); await cached.musicError('1');
  expect(mathCalls).toBe(202);
  expect(musicCalls).toBe(202);
});

test('a renderer loading failure stays distinct from invalid syntax and can be retried', async () => {
  let available = false;
  const cached = validity(katex, async () => { if (!available) throw new Error('offline'); return abcjs; });
  await expect(cached.musicError('X:1\nK:C\nC')).rejects.toThrow('offline');
  available = true;
  expect(await cached.musicError('X:1\nK:C\nC')).toBeNull();
});

test('error traversal preserves document order and embed positions across nested and empty nodes', async () => {
  const content = JSON.stringify({ root: { children: [
    { type: 'equation', equation: '' },
    { type: 'paragraph', children: [{ type: 'equation', equation: '\\frac{1}{', inline: true }] },
    { type: 'music', abc: 'X:1\nK:C\nCDEF|' },
    { type: 'music', abc: 'X:1\nK:C\nCDE [' },
  ] } });
  expect((await errors.noteEmbedErrors(content)).map(({ index, type }) => ({ index, type })))
    .toEqual([{ index: 1, type: 'equation' }, { index: 3, type: 'music' }]);
});

test('serialization retains invalid source verbatim and removes only empty embeds', () => {
  const { serializeNoteContent } = load('app/editor/note-content.ts', { '@/app/editor/styleConfig': {} });
  const equation = { type: 'equation', equation: ' \\frac{1}{\n' };
  const score = { type: 'music', abc: 'X:1\nK:C\nCDE [' };
  const state = { root: { children: [equation, { type: 'equation', equation: ' ' }, score, { type: 'music', abc: '' }] } };
  expect(JSON.parse(serializeNoteContent(state)).root.children).toEqual([equation, score]);
});

test.each(['Equation', 'Music'])('%s HTML imports bound external source while JSON reload preserves invalid source', kind => {
  const lexical = require('lexical');
  const nodes = load(`app/editor/nodes/${kind}Node.tsx`, { [`../plugins/${kind}Component`]: {} });
  const type = kind.toLowerCase();
  const field = kind === 'Equation' ? 'equation' : 'abc';
  const Node = nodes[`${kind}Node`];
  const editor = lexical.createEditor({ nodes: [Node], onError: error => { throw error; } });
  editor.update(() => {
    const source = 'x'.repeat(10001);
    const dom = { hasAttribute: () => true, getAttribute: name => name === `data-lexical-${type}` ? source : 'false' };
    const imported = Node.importDOM().div(dom).conversion(dom).node;
    lexical.$getRoot().append(imported);
    expect(imported.exportJSON()[field]).toHaveLength(10000);
    const invalid = Node.importJSON({ type, [field]: 'unfinished {', inline: false, version: 1 });
    expect(invalid.exportJSON()[field]).toBe('unfinished {');
  }, { discrete: true });
});

test('project counting deduplicates shared notes, reuses unloaded content and preserves review URLs', async () => {
  let reads = 0;
  const { projectEmbedErrors, embedReviewUrl } = load('lib/project-embed-errors.ts', {
    '@/app/editor/embed-validity': errors,
    '@/lib/item-content-client': { getItemContent: async () => { reads++; return JSON.stringify({ root: { children: [{ type: 'equation', equation: '{' }] } }); } },
  });
  const contents = new Map();
  const items = { '1': { id: '1', content: null }, '2': { id: '2', content: '' } };
  const result = await projectEmbedErrors(items, contents);
  expect(result).toHaveLength(1);
  expect(embedReviewUrl('project', result[0])).toBe('/editor/project?note=1&embed=0');
  await projectEmbedErrors(items, contents);
  expect(reads).toBe(1);
  expect(await projectEmbedErrors({ ...items, '1': { id: '1', content: '' } }, contents)).toEqual([]);
});


test('inline and display equations validate in the same mode as rendering', () => {
  expect(errors.equationError('x\\tag{1}', false)).toBeNull();
  expect(errors.equationError('x\\tag{1}', true)).toBeTruthy();
});

test('shared persisted-content contract identifies legacy sources without losing them', () => {
  const { isLegacyNoteContent, serializeNoteContent } = load('app/editor/note-content.ts', {
    '@/app/editor/styleConfig': { parseAllowedColor: () => '', parseAllowedFontSize: () => '' },
  });
  const fixtures = JSON.parse(readFileSync('tests/fixtures/editor-content-contract.json', 'utf8'));
  for (const fixture of fixtures) {
    const node = { ...fixture.node };
    const field = node.type === 'equation' ? 'equation' : 'abc';
    if (fixture.repeat > 1) node[field] = node[field].repeat(fixture.repeat);
    const state = { root: { type: 'root', children: [node] } };
    expect(isLegacyNoteContent(JSON.stringify(state))).toBe(!fixture.strict);
    expect(JSON.parse(serializeNoteContent(state))).toEqual(state);
  }
});

test.each(['Equation', 'Music'])('%s preserves non-text legacy JSON while rendering a marked fallback', kind => {
  const lexical = require('lexical');
  const nodes = load(`app/editor/nodes/${kind}Node.tsx`, { [`../plugins/${kind}Component`]: { default: kind } });
  const Node = nodes[`${kind}Node`];
  const field = kind === 'Equation' ? 'equation' : 'abc';
  const editor = lexical.createEditor({ nodes: [Node], onError: error => { throw error; } });
  for (const value of [42, null, true, {}, []]) {
    editor.update(() => {
      const node = Node.importJSON({ type: kind.toLowerCase(), version: 1, [field]: value });
      lexical.$getRoot().clear().append(node);
      expect(node.exportJSON()[field]).toEqual(value);
      expect(node.decorate().props.invalidSource).toBe(true);
      expect(node.decorate().props[field]).toBe(JSON.stringify(value));
      expect(Node.clone(node).exportJSON()[field]).toEqual(value);
    }, { discrete: true });
    expect(editor.getEditorState().toJSON().root.children[0][field]).toEqual(value);
  }
});

test('non-text legacy embeds contribute to the global error count', async () => {
  const content = JSON.stringify({ root: { children: [{ type: 'equation', equation: 42 }, { type: 'music', abc: null }] } });
  expect((await errors.noteEmbedErrors(content)).map(({ type }) => type)).toEqual(['equation', 'music']);
});
