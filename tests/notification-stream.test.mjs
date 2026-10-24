import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync('lib/notification-stream.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

function browser({ locks = true, broadcast = true } = {}) {
  const channels = new Set(), sources = [], timers = new Map(), held = new Map(), pending = [];
  let timerId = 0;
  function grant(key) {
    if (held.has(key)) return;
    const index = pending.findIndex(entry => entry.key === key);
    if (index < 0) return;
    const entry = pending.splice(index, 1)[0];
    entry.signal.removeEventListener('abort', entry.abort);
    held.set(key, entry);
    Promise.resolve().then(entry.callback).then(entry.resolve, entry.reject).finally(() => {
      held.delete(key);
      grant(key);
    });
  }
  const navigator = { locks: locks ? {
    request: (key, { signal }, callback) => new Promise((resolve, reject) => {
      const entry = { key, signal, callback, resolve, reject };
      entry.abort = () => { pending.splice(pending.indexOf(entry), 1); reject(new Error('aborted')); };
      signal.addEventListener('abort', entry.abort, { once: true });
      pending.push(entry);
      grant(key);
    }),
  } : undefined };
  class Channel {
    constructor(key) { this.key = key; channels.add(this); }
    postMessage(data) {
      for (const peer of channels) if (peer !== this && peer.key === this.key) {
        queueMicrotask(() => { if (channels.has(peer)) peer.onmessage?.({ data }); });
      }
    }
    close() { channels.delete(this); }
  }
  class Source {
    constructor(url) { this.url = url; this.listeners = {}; this.closed = false; sources.push(this); }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    emit(name, data) { this.listeners[name]?.({ data: JSON.stringify(data) }); }
    close() { this.closed = true; }
  }
  function tab(userId = 'one') {
    const exports = {}, counts = [];
    runInNewContext(code, {
      exports, navigator, AbortController, BroadcastChannel: broadcast ? Channel : undefined, EventSource: Source,
      setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
      clearTimeout: id => timers.delete(id),
    });
    return { counts, stop: exports.subscribeNotificationCount(userId, count => counts.push(count)) };
  }
  return { tab, sources, timers, held, pending, channels, retry: () => {
    const [id, timer] = timers.entries().next().value;
    timers.delete(id);
    timer.callback();
    return timer.delay;
  } };
}

test('shares one stream, broadcasts locally and supplies late followers with the latest count', async () => {
  const b = browser();
  const leader = b.tab(), follower = b.tab();
  await flush();
  expect(b.sources).toHaveLength(1);
  b.sources[0].emit('unread-count', { unreadCount: 4 });
  await flush();
  expect(leader.counts).toEqual([4]);
  expect(follower.counts).toEqual([4]);
  const late = b.tab();
  await flush();
  expect(late.counts).toEqual([4]);
  expect(b.sources).toHaveLength(1);
  leader.stop(); follower.stop(); late.stop();
  await flush();
  expect(b.channels.size).toBe(0);
  expect(b.held.size).toBe(0);
});

test('hands leadership to a waiting tab and cancels a disposed waiter', async () => {
  const b = browser();
  const leader = b.tab(), disposed = b.tab(), follower = b.tab();
  await flush();
  disposed.stop();
  leader.stop();
  await flush();
  expect(b.sources).toHaveLength(2);
  expect(b.sources[0].closed).toBe(true);
  b.sources[1].emit('unread-count', { unreadCount: 9 });
  expect(follower.counts).toEqual([9]);
  expect(disposed.counts).toEqual([]);
  follower.stop();
  await flush();
  expect(b.pending).toHaveLength(0);
  expect(b.held.size).toBe(0);
});

test('isolates accounts and ignores malformed counts', async () => {
  const b = browser();
  const one = b.tab('one'), two = b.tab('two');
  await flush();
  expect(b.sources).toHaveLength(2);
  for (const unreadCount of [-1, 0.5, '2', null]) b.sources[0].emit('unread-count', { unreadCount });
  b.sources[0].emit('unread-count', { unreadCount: 3 });
  await flush();
  expect(one.counts).toEqual([3]);
  expect(two.counts).toEqual([]);
  one.stop(); two.stop();
});

test('retries with capped backoff, resets after recovery and cancels timers on cleanup', async () => {
  const b = browser();
  const tab = b.tab();
  await flush();
  for (let i = 0; i < 8; i++) {
    const source = b.sources.at(-1);
    source.onerror();
    source.onerror();
    expect(source.closed).toBe(true);
    expect(b.timers.size).toBe(1);
    const delay = b.retry();
    expect(delay).toBeGreaterThanOrEqual(Math.min(30000, 1000 * 2 ** i));
    expect(delay).toBeLessThanOrEqual(30000);
  }
  b.sources.at(-1).emit('unread-count', { unreadCount: 7 });
  b.sources.at(-1).onerror();
  expect([...b.timers.values()][0].delay).toBeLessThanOrEqual(1200);
  tab.stop();
  expect(b.timers.size).toBe(0);
  await flush();
  expect(b.held.size).toBe(0);
});

test('eviction closes permanently and prevents follower takeover', async () => {
  const b = browser();
  const leader = b.tab(), follower = b.tab();
  await flush();
  b.sources[0].emit('evicted', '');
  b.sources[0].onerror();
  await flush();
  expect(b.sources[0].closed).toBe(true);
  expect(b.timers.size).toBe(0);
  expect(b.sources).toHaveLength(1);
  leader.stop();
  await flush();
  expect(b.sources).toHaveLength(1);
  follower.stop();
});

test.each([{ locks: false }, { broadcast: false }])('falls back to per-tab streams without browser coordination: %o', async options => {
  const b = browser(options);
  const one = b.tab(), two = b.tab();
  expect(b.sources).toHaveLength(2);
  b.sources[0].emit('evicted', '');
  b.sources[0].onerror();
  expect(b.timers.size).toBe(0);
  one.stop(); two.stop();
  expect(b.sources.every(source => source.closed)).toBe(true);
});
