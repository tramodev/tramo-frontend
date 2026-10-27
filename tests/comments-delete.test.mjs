import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const transpile = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

test.each([204, 401, 403, 503])('deleting a comment checks backend status %i', async status => {
  const exports = {}, http = {};
  runInNewContext(transpile('lib/http.ts'), { exports: http, Error });
  runInNewContext(transpile('lib/comments.ts'), {
    exports,
    require: name => ({ '@/lib/config': { API_BASE_URL: 'http://backend' }, '@/lib/api': { authenticatedFetch: async () => new Response(null, { status }) }, '@/lib/http': http })[name],
  });
  if (status === 204) await expect(exports.deleteComment('42')).resolves.toBeUndefined();
  else await expect(exports.deleteComment('42')).rejects.toThrow(String(status));
});

test('a rejected comment deletion shows an error without changing the count and can be retried', async () => {
  const states = [], effects = [], transitions = [], exports = {};
  let index = 0, initial = true, reject = true, count = 2;
  const jsx = (type, props) => ({ type, props });
  runInNewContext(transpile('components/project/comments-section.tsx'), {
    exports,
    window: { location: { hash: '' } },
    require: name => ({
      react: {
        useState: value => {
          const slot = index++;
          if (!(slot in states)) states[slot] = value;
          return [states[slot], next => { states[slot] = typeof next === 'function' ? next(states[slot]) : next; }];
        },
        useEffect: effect => { if (initial) effects.push(effect); },
        useRef: value => ({ current: value }),
        useTransition: () => [false, action => transitions.push(Promise.resolve().then(action))],
      },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'next/navigation': { useRouter: () => ({ push() {} }) },
      '@/components/shared/confirm-dialog': { ConfirmDialog: 'ConfirmDialog' },
      '@/lib/comments': {
        getComments: async () => ({ items: [{ id: '42', content: 'kept', parentId: null }], hasMore: false }),
        deleteComment: async () => { if (reject) throw new Error('403'); },
      },
    })[name] ?? {},
  });
  function render() {
    index = 0;
    return flatten(exports.CommentsSection({ projectId: 'project', projectTitle: 'Project', isLoggedIn: true, canComment: true, commentCount: count, onCommentCountChange: update => { count = update(count); } }));
  }
  render();
  initial = false;
  effects.forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  function remove() {
    render().find(node => node.type?.name === 'CommentItem').props.onDelete();
    render().find(node => node.type === 'ConfirmDialog').props.onConfirm();
    return Promise.all(transitions.splice(0));
  }
  await remove();
  expect(count).toBe(2);
  expect(render().find(node => node.props.role === 'alert').props.children).toContain("Couldn't delete");
  expect(render().some(node => node.type?.name === 'CommentItem' && node.props.comment.id === '42')).toBe(true);
  reject = false;
  await remove();
  expect(count).toBe(1);
  expect(render().some(node => node.props.role === 'alert')).toBe(false);
});

test('focused comment loading preserves the resolved page for further pagination', async () => {
  const exports = {}, requests = [];
  runInNewContext(transpile('lib/comments.ts'), { exports, encodeURIComponent, require: name => ({
    '@/lib/config': { API_BASE_URL: 'http://backend' },
    '@/lib/api': { authenticatedFetch: async (url, init) => { requests.push([url, init]); return Response.json({ content: [{ id: 42, parentId: 40 }], hasMore: true, page: 3 }); } },
    '@/lib/http': {},
  })[name] });
  const page = await exports.getComments('encoded', 0, 20, '42');
  expect(requests[0]).toEqual(['http://backend/api/public/project/encoded/comments?page=0&size=20&focusId=42', { cache: 'no-store' }]);
  expect(page).toEqual({ items: [{ id: '42', parentId: '40' }], hasMore: true, nextPage: 4 });
});

test('a linked comment receives focus once and further pagination keeps the user focus', async () => {
  const exports = {}, slots = [], effects = [], requests = [], focused = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const comment = id => ({ id, content: 'Comment', parentId: null, createdDate: '2026-10-27T12:00:00Z' });
  runInNewContext(transpile('components/project/comments-section.tsx'), {
    exports, window: { location: { hash: '#comment-42' } },
    document: { getElementById: id => ({ scrollIntoView() {}, focus: () => focused.push(id) }) },
    require: name => ({
      react: {
        useState: value => { const slot = cursor++; if (!(slot in slots)) slots[slot] = value; return [slots[slot], next => { slots[slot] = typeof next === 'function' ? next(slots[slot]) : next; }]; },
        useRef: value => { const slot = cursor++; return slots[slot] ??= { current: value }; },
        useEffect: (effect, deps) => { const slot = cursor++; if (!slots[slot] || deps.some((value, i) => value !== slots[slot][i])) { effects.push(effect); slots[slot] = deps; } },
        useTransition: () => [false, action => action()],
      },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'next/navigation': { useRouter: () => ({ push() {} }) },
      '@/components/ui/button': { Button: 'Button' },
      '@/lib/comments': { getComments: async (...args) => { requests.push(args); return { items: [comment(requests.length === 1 ? '42' : '43')], hasMore: true, nextPage: requests.length + 2 }; } },
    })[name] ?? {},
  });
  function render() { cursor = 0; return flatten(exports.CommentsSection({ projectId: 'encoded', isLoggedIn: true, commentCount: 25, onCommentCountChange() {} })); }
  async function settle() { render(); effects.splice(0).forEach(effect => effect()); await new Promise(setImmediate); return render(); }
  await settle(); await settle();
  expect(requests[0]).toEqual(['encoded', 0, 20, '42']);
  expect(focused).toEqual(['comment-42']);
  const item = render().find(node => node.type?.name === 'CommentItem');
  expect(item.type(item.props).props.id).toBe('comment-42');
  render().find(node => node.type === 'Button' && node.props.children === 'Load more comments').props.onClick();
  await settle(); await settle();
  expect(requests[1]).toEqual(['encoded', 3, 20]);
  expect(focused).toEqual(['comment-42']);
});
