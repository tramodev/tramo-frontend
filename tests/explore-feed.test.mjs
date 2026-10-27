import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

function feed() {
  const states = [], refs = [], exports = {}, calls = [];
  let stateIndex = 0, refIndex = 0, response;
  const jsx = (type, props) => ({ type, props });
  const source = ts.transpileModule(readFileSync('components/feed/explore-feed.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(source, {
    exports, requestAnimationFrame: callback => callback(),
    require: name => ({
      react: {
        useState: initial => { const slot = stateIndex++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial; return [states[slot], next => { states[slot] = typeof next === 'function' ? next(states[slot]) : next; }]; },
        useRef: initial => { const slot = refIndex++; return refs[slot] ??= { current: initial }; },
      },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      '@/components/ui/button': { Button: 'Button' },
      '@/components/feed/explore-card': { ExploreCard: 'Card' },
      '@/lib/config': { EXPLORE_PAGE_SIZE: 20 },
      '@/lib/public-project': { getExploreBundle: async (...args) => { calls.push(args); return response(); } },
    })[name],
  });
  function render() {
    stateIndex = 0; refIndex = 0;
    return flatten(exports.ExploreFeed({ initialItems: [{ id: 'one' }], initialHasMore: true, initialCursor: 'first', featuredId: 'featured', sort: 'recent', loggedIn: false, username: null }));
  }
  return { render, calls, respond: value => { response = value; }, click: () => render().find(n => n.type === 'Button').props.onClick() };
}

test('continuations use cursors, deduplicate projects and focus the first new card', async () => {
  const f = feed();
  f.respond(async () => ({ feed: [{ id: 'one' }, { id: 'two' }, { id: 'two' }, { id: 'featured' }], hasMore: true, nextCursor: 'second' }));
  await f.click();
  let nodes = f.render();
  expect(nodes.filter(n => n.type === 'Card').map(n => n.props.project.id)).toEqual(['one', 'two']);
  expect(nodes.find(n => n.props.role === 'status').props.children).toContain('1 project added. 2 projects shown.');
  let focused = false;
  const wrapper = nodes.find(n => n.type === 'div' && n.props.children?.props?.project?.id === 'two');
  wrapper.props.ref({ querySelector: () => ({ focus: () => { focused = true; } }) });
  expect(focused).toBe(true);
  f.respond(async () => ({ feed: [{ id: 'three' }], hasMore: false, nextCursor: null }));
  await f.click();
  expect(f.calls.map(call => [call[2], call[4]])).toEqual([[0, 'first'], [0, 'second']]);
  nodes = f.render();
  expect(nodes.some(n => n.type === 'Button')).toBe(false);
  expect(nodes.find(n => n.props.role === 'status').props.children).toContain('All projects loaded.');
});

test('failed loads preserve cards and cursor, show an alert and allow retry', async () => {
  const f = feed();
  f.respond(async () => { throw Error('429'); });
  await f.click();
  expect(f.render().some(n => n.props.role === 'alert')).toBe(true);
  expect(f.render().filter(n => n.type === 'Card')).toHaveLength(1);
  f.respond(async () => ({ feed: [{ id: 'two' }], hasMore: false, nextCursor: null }));
  await f.click();
  expect(f.calls.map(call => call[4])).toEqual(['first', 'first']);
  expect(f.render().some(n => n.props.role === 'alert')).toBe(false);
});

test('pending loads keep the button focusable and reject duplicate requests', async () => {
  const f = feed();
  let resolve;
  f.respond(() => new Promise(done => { resolve = done; }));
  const pending = f.click();
  const button = f.render().find(n => n.type === 'Button');
  expect(button.props['aria-disabled']).toBe(true);
  expect(button.props.disabled).toBeUndefined();
  await f.click();
  expect(f.calls).toHaveLength(1);
  let focused = false;
  f.render().find(n => n.props.role === 'status').props.ref.current = { focus: () => { focused = true; } };
  resolve({ feed: [], hasMore: false, nextCursor: null });
  await pending;
  expect(focused).toBe(true);
});

test('the API client propagates rate limits and preserves the next cursor', async () => {
  const exports = {}, http = {}, calls = [];
  const transpile = path => ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(transpile('lib/http.ts'), { exports: http, Error });
  let status = 429;
  runInNewContext(transpile('lib/public-project.ts'), {
    exports, URL,
    require: name => ({
      '@/lib/backend-fetch': { backendFetch: async url => { calls.push(url); return status === 429 ? new Response(null, { status }) : Response.json({ feed: [], hasMore: true, nextCursor: 'next', featured: null, hotTopics: [], activeAuthors: [], trendingProjects: [] }); } },
      '@/lib/http': http,
      './config': { API_BASE_URL: 'http://backend', EXPLORE_PAGE_SIZE: 20 },
      './auth': { authHeaders: async () => ({}) },
      './feed': { toFeedItem: item => item },
    })[name] ?? {},
  });
  await expect(exports.getExploreBundle()).rejects.toThrow('429');
  status = 200;
  const bundle = await exports.getExploreBundle('query', 'recent', 0, 20, 'cursor');
  expect(bundle.nextCursor).toBe('next');
  expect(calls[1].searchParams.get('cursor')).toBe('cursor');
});
