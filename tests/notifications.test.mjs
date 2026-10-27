import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const transpile = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
const flush = () => new Promise(resolve => setImmediate(resolve));

test.each([401, 403, 500])('notification writes reject status %i', async status => {
  const exports = {}, http = {};
  runInNewContext(transpile('lib/http.ts'), { exports: http, Error });
  runInNewContext(transpile('lib/notifications.ts'), {
    exports,
    require: name => ({ '@/lib/config': { API_BASE_URL: 'http://backend' }, '@/lib/api': { authenticatedFetch: async () => new Response(null, { status }) }, '@/lib/http': http })[name],
  });
  await expect(exports.markAllNotificationsRead()).rejects.toThrow(String(status));
  await expect(exports.deleteNotification('42')).rejects.toThrow(String(status));
  await expect(exports.markNotificationRead('42')).rejects.toThrow(String(status));
  await expect(exports.getNotifications()).rejects.toThrow(String(status));
  await expect(exports.getUnreadCount()).rejects.toThrow(String(status));
});

function panel() {
  const states = [], refs = [], effects = [], exports = {}, calls = [];
  let notify;
  let index = 0, refIndex = 0, first = true, fail = false, counter = 2, items = [{ id: '42', type: 'UPVOTE', count: 1, read: false, updatedDate: '2026-10-24T20:00:00Z' }];
  const jsx = (type, props) => ({ type, props });
  const api = {
    getNotifications: async (page = 0, size = 20) => { calls.push('list'); if (fail) throw Error('500'); return { items: items.slice(page * size, (page + 1) * size), hasMore: (page + 1) * size < items.length }; },
    getUnreadCount: async () => counter,
    markAllNotificationsRead: async () => { calls.push('all'); if (fail) throw Error('500'); counter = 0; items = items.map(n => ({ ...n, read: true })); },
    markNotificationRead: async () => { calls.push('one'); if (fail) throw Error('500'); counter--; items = items.map(n => ({ ...n, read: true })); },
    deleteNotification: async () => { calls.push('delete'); if (fail) throw Error('500'); items = []; },
  };
  runInNewContext(transpile('components/layout/notification-button.tsx'), {
    exports,
    require: name => ({
      react: {
        useCallback: callback => callback,
        useState: value => { const slot = index++; if (!(slot in states)) states[slot] = value; return [states[slot], next => { states[slot] = typeof next === 'function' ? next(states[slot]) : next; }]; },
        useRef: value => { const slot = refIndex++; return refs[slot] ??= { current: value }; },
        useEffect: effect => { if (first) effects.push(effect); },
      },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'next/navigation': { useRouter: () => ({ push() {} }) },
      '@/lib/notification-stream': { subscribeNotificationCount: (_, callback) => { notify = callback; callback(counter); return () => {}; } },
      '@/lib/notifications': api,
      '@/components/ui/popover': { Popover: 'Panel', PopoverContent: 'Content', PopoverTrigger: 'Trigger' },
      '@/components/ui/dropdown-menu': { DropdownMenu: 'Panel', DropdownMenuContent: 'Content', DropdownMenuTrigger: 'Trigger', DropdownMenuItem: 'Item' },
    })[name] ?? {},
  });
  function render() { index = 0; refIndex = 0; return flatten(exports.NotificationButton({ loggedIn: true, userId: 'one' })); }
  render(); first = false; effects.forEach(effect => effect());
  return {
    render, calls,
    async publish(count) { notify(count); await flush(); },
    fail: value => { fail = value; },
    items: value => { items = value; },
    async open(value = true) { await render().find(n => n.type === 'Panel').props.onOpenChange(value); await flush(); },
    async click(label) { await render().find(n => n.props['aria-label'] === label).props.onClick({ preventDefault() {}, stopPropagation() {} }); await flush(); },
    async older() { await render().find(n => n.type === 'button' && n.props.children === 'Load older').props.onClick({ preventDefault() {} }); await flush(); },
  };
}

test('reopening fetches fresh notifications and opening does not mark anything read', async () => {
  const p = panel();
  await p.open();
  expect(p.calls).toEqual(['list']);
  await p.open(false);
  p.items([]);
  await p.open();
  expect(p.calls).toEqual(['list', 'list']);
});

test('read and dismiss controls are visible, timestamps exist and failed writes preserve state', async () => {
  const p = panel();
  await p.open();
  expect(p.render().some(n => n.type === 'time' && n.props.dateTime)).toBe(true);
  const dismiss = p.render().find(n => n.props['aria-label'] === 'Dismiss notification');
  expect(dismiss.props.className).not.toContain('opacity-0');
  p.fail(true);
  await p.click('Mark all as read');
  expect(p.render().some(n => n.props.role === 'alert')).toBe(true);
  expect(p.render().some(n => n.props['aria-label'] === 'Mark as read')).toBe(true);
  await p.click('Dismiss notification');
  expect(p.render().some(n => n.props['aria-label'] === 'Dismiss notification')).toBe(true);
  p.fail(false);
  await p.click('Mark as read');
  expect(p.render().some(n => n.props['aria-label'] === 'Mark as read')).toBe(false);
});

test('a stream update refreshes an open panel and leaves a closed panel alone', async () => {
  const p = panel();
  await p.open();
  p.items([]);
  await p.publish(0);
  expect(p.calls).toEqual(['list', 'list']);
  expect(p.render().some(n => n.props['aria-label'] === 'Mark as read')).toBe(false);
  await p.open(false);
  await p.publish(1);
  expect(p.calls).toEqual(['list', 'list']);
});

test('stream updates retain loaded pages and keep the existing list mounted while fetching', async () => {
  const p = panel();
  const items = Array.from({ length: 45 }, (_, i) => ({ id: String(i), type: 'FOLLOW', count: 1, read: false, updatedDate: '2026-10-24T20:00:00Z' }));
  p.items(items);
  await p.open();
  await p.older();
  expect(p.render().filter(n => n.type === 'time')).toHaveLength(40);
  p.items([{ ...items[0], id: 'new' }, ...items]);
  const updating = p.publish(46);
  expect(p.render().filter(n => n.type === 'time')).toHaveLength(40);
  await updating;
  expect(p.render().filter(n => n.type === 'time')).toHaveLength(40);
  await p.older();
  expect(p.render().filter(n => n.type === 'time')).toHaveLength(46);
  p.fail(true);
  await p.publish(47);
  expect(p.render().filter(n => n.type === 'time')).toHaveLength(46);
  expect(p.render().some(n => n.props.role === 'alert')).toBe(true);
});

test('moderation notices display the server message', async () => {
  const p = panel();
  p.items([{ id: '99', type: 'MODERATION', message: 'Your account has been unbanned.', count: 1, read: false, updatedDate: '2026-10-27T12:00:00Z' }]);
  await p.open();
  expect(p.render().some(node => node.props.children === 'Your account has been unbanned.')).toBe(true);
});
