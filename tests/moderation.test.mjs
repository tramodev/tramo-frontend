import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const transpile = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
const flush = () => new Promise(setImmediate);

function dashboard(reportType = 'PROJECT', logOnly = false) {
  const exports = {}, slots = [], effects = [], calls = [], focus = [];
  let index = 0, fail = false;
  const report = { id: '1', type: reportType, projectId: 'encoded-project', commentId: '42', projectTitle: 'Project', reason: 'Reporter reason', status: 'OPEN', createdDate: '2026-10-27T12:00:00Z' };
  const jsx = (type, props) => ({ type, props });
  const write = name => async (...args) => { calls.push([name, ...args]); if (fail) throw Error('500'); };
  runInNewContext(transpile('components/admin/admin-dashboard.tsx'), {
    exports, requestAnimationFrame: fn => fn(),
    require: name => ({
      react: {
        useState: value => { const slot = index++; if (!(slot in slots)) slots[slot] = value; return [slots[slot], next => { slots[slot] = typeof next === 'function' ? next(slots[slot]) : next; }]; },
        useRef: value => { const slot = index++; return slots[slot] ??= { current: value }; },
        useEffect: (effect, deps) => { const slot = index++; if (!slots[slot] || deps.some((dep, i) => dep !== slots[slot][i])) { effects.push(effect); slots[slot] = deps; } },
      },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'next/link': { __esModule: true, default: 'Link' },
      '@/components/ui/button': { Button: 'Button' },
      '@/components/ui/input': { Input: 'Input' },
      '@/components/ui/dialog': { Dialog: 'Dialog', DialogContent: 'DialogContent', DialogTitle: 'DialogTitle' },
      '@/lib/moderation': {
        listReports: async (...args) => { calls.push(['reports', ...args]); return { items: [report], hasMore: true }; },
        searchAdminUsers: async () => [{ id: 'admin', username: 'Admin', role: 'ADMIN' }, { id: 'other', username: 'Other admin', role: 'ADMIN' }, { id: 'user', username: 'User', role: 'USER' }],
        getModerationLog: async page => { calls.push(['log', page]); return { content: [{ id: 1, targetType: 'PROJECT', targetId: 'encoded-project', action: 'UNPUBLISH_PROJECT', publishingBlocked: true, createdDate: '2026-10-27T12:00:00Z' }], hasMore: true }; },
        allowProjectPublishing: write('allow'),
        dismissReport: write('dismiss'), unpublishProject: write('unpublish'), upholdCommentReport: write('uphold'), banUser: write('ban'), unbanUser: write('unban'),
      },
    })[name] ?? {},
  });
  let View = exports.AdminDashboard;
  let props = {};
  if (logOnly) {
    View = flatten(exports.AdminDashboard()).find(node => node.type?.name === 'ModerationLogPanel').type;
    props = { epoch: 0, onChanged: () => calls.push(['changed']) };
    slots.length = 0; effects.length = 0;
  }
  function render() {
    index = 0;
    const nodes = flatten(View(props));
    for (const node of nodes) if (node.type === 'h2' && node.props.ref) node.props.ref.current = { focus: () => focus.push('reports') };
    return nodes;
  }
  async function settle() { render(); effects.splice(0).forEach(effect => effect()); await flush(); return render(); }
  return { render, settle, calls, focus, fail: value => { fail = value; }, report };
}

test('admin rows cannot be banned and the ban dialog restores focus to its opener', async () => {
  const p = dashboard(); await p.settle();
  const buttons = p.render().filter(node => node.type === 'Button' && node.props.children?.includes?.('Ban'));
  expect(buttons).toHaveLength(1);
  const opener = { isConnected: true, focus: () => p.focus.push('opener') };
  buttons[0].props.onClick({ currentTarget: opener });
  expect(p.render().find(node => node.type === 'Dialog').props.open).toBe(true);
  expect(p.render().find(node => node.type === 'DialogTitle').props.children).toBe('Ban User?');
  p.render().find(node => node.type === 'Dialog').props.onOpenChange(false);
  const close = p.render().find(node => node.type === 'DialogContent').props.onCloseAutoFocus;
  close({ preventDefault() {} });
  expect(p.focus).toEqual(['opener']);
});

test.each(['PROJECT', 'COMMENT'])('%s moderation uses the admin reason and the correct action', async type => {
  const p = dashboard(type); await p.settle();
  const label = type === 'COMMENT' ? 'Delete comment' : 'Unpublish';
  p.render().find(node => node.type === 'Button' && node.props.children === label).props.onClick({ currentTarget: {} });
  const input = p.render().find(node => node.type === 'Input' && node.props.maxLength === 255);
  input.props.onChange({ target: { value: 'Moderator reason' } });
  await p.render().find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  await flush();
  expect(p.calls).toContainEqual(type === 'COMMENT' ? ['uphold', '1', 'Moderator reason'] : ['unpublish', 'encoded-project', 'Moderator reason']);
  expect(p.render().find(node => node.type === 'Dialog').props.open).toBe(false);
});

test('reported comments link directly to their comment and dismissed reports leave focus on the report heading', async () => {
  const p = dashboard('COMMENT'); await p.settle();
  expect(p.render().find(node => node.type === 'Link').props.href).toBe('/p/encoded-project#comment-42');
  p.render().find(node => node.type === 'Button' && node.props.children === 'Dismiss').props.onClick();
  await flush();
  expect(p.calls).toContainEqual(['dismiss', '1', 'COMMENT']);
  expect(p.focus).toEqual(['reports']);
});

test('report filters reset pagination and failed actions preserve the report', async () => {
  const p = dashboard(); await p.settle();
  p.render().find(node => node.props.children === 'Next reports').props.onClick();
  await p.settle();
  expect(p.calls).toContainEqual(['reports', 1, 'ALL', 'OPEN']);
  p.render().find(node => node.type === 'select' && node.props.value === 'ALL').props.onChange({ target: { value: 'COMMENT' } });
  await p.settle();
  expect(p.calls).toContainEqual(['reports', 0, 'COMMENT', 'OPEN']);
  p.fail(true);
  p.render().find(node => node.type === 'Button' && node.props.children === 'Dismiss').props.onClick();
  await flush();
  expect(p.render().some(node => node.props.role === 'alert')).toBe(true);
  expect(p.render().some(node => node.props.children === 'Dismiss')).toBe(true);
});

test('moderation requests preserve encoded project IDs, pagination and backend failures', async () => {
  const exports = {}, requests = [];
  let status = 200;
  runInNewContext(transpile('lib/moderation.ts'), { exports, encodeURIComponent, require: name => ({
    '@/lib/config': { API_BASE_URL: 'http://backend' },
    '@/lib/api': { authenticatedFetch: async (url, init) => { requests.push([url, init]); return Response.json({ content: [{ id: 1, projectId: 'encoded', commentId: 42 }], hasMore: true }, { status }); } },
    '@/lib/http': { expectOk: async response => { if (!response.ok) throw Error(String(response.status)); } },
  })[name] });
  const page = await exports.listReports(5, 'COMMENT', 'UPHELD');
  expect(requests[0][0]).toBe('http://backend/api/admin/reports?page=5&size=20&type=COMMENT&status=UPHELD');
  expect(page.items[0]).toMatchObject({ id: '1', projectId: 'encoded', commentId: '42' });
  await exports.upholdCommentReport('1', 'Own reason');
  expect(requests[1][0]).toBe('http://backend/api/admin/comment-reports/1/uphold');
  expect(JSON.parse(requests[1][1].body)).toEqual({ reason: 'Own reason' });
  for (const type of ['PROJECT', 'COMMENT']) {
    await exports.dismissReport('1', type);
    expect(requests.at(-1)[0]).toBe(`http://backend/api/admin/reports/1/dismiss?type=${type}`);
  }
  status = 403;
  await expect(exports.getModerationLog()).rejects.toThrow('403');
  await expect(exports.listReports()).rejects.toThrow('403');
  await expect(exports.allowProjectPublishing('encoded')).rejects.toThrow('403');
});

test('the moderation log paginates and allows publishing with the encoded project ID', async () => {
  const p = dashboard('PROJECT', true); await p.settle();
  expect(p.calls).toContainEqual(['log', 0]);
  expect(p.render().some(node => node.type === 'Link' && node.props.href === '/p/encoded-project')).toBe(true);
  p.render().find(node => node.props.children === 'Allow publishing').props.onClick();
  await flush();
  expect(p.calls).toContainEqual(['allow', 'encoded-project']);
  expect(p.calls).toContainEqual(['changed']);
  p.render().find(node => node.props.children === 'Next actions').props.onClick();
  await p.settle();
  expect(p.calls).toContainEqual(['log', 1]);
});
