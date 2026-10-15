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
    require: name => ({ './config': { API_BASE_URL: 'http://backend' }, './api': { authenticatedFetch: async () => new Response(null, { status }) }, './http': http })[name],
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
    require: name => ({
      react: {
        useState: value => {
          const slot = index++;
          if (!(slot in states)) states[slot] = value;
          return [states[slot], next => { states[slot] = typeof next === 'function' ? next(states[slot]) : next; }];
        },
        useEffect: effect => { if (initial) effects.push(effect); },
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
