import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const transpile = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function listeners() {
  const map = new Map();
  return {
    addEventListener: (type, fn) => map.set(type, [...map.get(type) ?? [], fn]),
    removeEventListener: (type, fn) => map.set(type, (map.get(type) ?? []).filter(other => other !== fn)),
    fire: (type, event = {}) => (map.get(type) ?? []).forEach(fn => fn(event)),
  };
}

function setup({ token = Promise.resolve('token'), role = 'EDITOR' } = {}) {
  const presence = {};
  runInNewContext(transpile('app/editor/presence.ts'), { exports: presence, URL, require: () => ({ publicImageOrigins: [] }) });
  const win = listeners();
  const doc = { ...listeners(), visibilityState: 'visible' };
  const timers = [];
  const providers = [];
  const forgotten = [];
  let now = 1_000_000;
  class Awareness {
    constructor(clientID) { this.clientID = clientID; this.states = new Map(); this.handlers = []; }
    setLocalState(state) { this.states.set(this.clientID, state); this.handlers.forEach(fn => fn()); }
    getStates() { return this.states; }
    on(_, fn) { this.handlers.push(fn); }
    off(_, fn) { this.handlers = this.handlers.filter(other => other !== fn); }
  }
  class HocuspocusProvider {
    constructor(config) { this.config = config; this.awareness = new Awareness(providers.length + 1); this.events = {}; providers.push(this); }
    on(type, fn) { this.events[type] = fn; }
    attach() { this.attached = true; }
    destroy() { this.destroyed = true; }
  }
  const effects = [], structureObservers = [], structures = [];
  let structureSnapshot;
  const exports = {};
  runInNewContext(transpile('app/editor/[projectId]/hooks/useProjectPresence.ts'), {
    exports, Date: { now: () => now }, Set, Map, Math, Promise,
    window: win, document: doc,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    require: name => ({
      react: {
        useState: init => [typeof init === 'function' ? init() : init],
        useRef: value => ({ current: value }),
        useEffect: fn => effects.push(fn),
        useSyncExternalStore: (_, get) => get(),
      },
      '@hocuspocus/provider': { HocuspocusProvider },
      yjs: { Doc: class { getMap() { return { observe: fn => { structureObservers.push(fn); }, get: () => structureSnapshot }; } } },
      '@/lib/collab-client': {
        COLLAB_ACCESS_DENIED: 'CollabAccessDenied',
        fetchProjectToken: () => token,
        forgetCollabToken: key => forgotten.push(key),
        presenceDocument: () => 'project-7',
      },
      '@/app/editor/presence': presence,
    })[name],
  });
  const local = { user: { id: '1', name: 'Ana', imageUrl: null }, role, itemId: '10', trailId: '3' };
  exports.useProjectPresence({}, 'abc', local, raw => structures.push(raw));
  effects.forEach(fn => fn());
  return { structureObservers, structures, setStructure: value => { structureSnapshot = value; }, win, doc, timers, providers, forgotten, advance: ms => { now += ms; }, state: () => providers.at(-1)?.awareness.getStates().get(providers.at(-1).awareness.clientID) };
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

test('publishes where I am and marks typing at most every two seconds', async () => {
  const s = setup();
  await flush();
  expect(s.providers[0].config).toMatchObject({ name: 'project-7', sessionAwareness: true });
  expect(s.state()).toMatchObject({ itemId: '10', trailId: '3', role: 'EDITOR', typingAt: null, hidden: false });
  const key = { target: { closest: selector => selector.includes('contenteditable') } };
  s.win.fire('keydown', key);
  const first = s.state().typingAt;
  expect(first).not.toBeNull();
  s.advance(1000);
  s.win.fire('keydown', key);
  expect(s.state().typingAt).toBe(first);
  s.advance(1500);
  s.win.fire('keydown', key);
  expect(s.state().typingAt).toBeGreaterThan(first);
});

test('viewers never publish typing', async () => {
  const s = setup({ role: 'VIEWER' });
  await flush();
  s.win.fire('keydown', { target: { closest: () => true } });
  expect(s.state().typingAt).toBeNull();
});

test('a hidden tab publishes it, but a closing tab stays gone', async () => {
  const s = setup();
  await flush();
  s.doc.visibilityState = 'hidden';
  s.doc.fire('visibilitychange');
  expect(s.state().hidden).toBe(true);
  s.doc.visibilityState = 'visible';
  s.doc.fire('visibilitychange');
  s.win.fire('pagehide');
  s.providers[0].awareness.states.clear();
  s.doc.visibilityState = 'hidden';
  s.doc.fire('visibilitychange');
  expect(s.state()).toBeUndefined();
  s.win.fire('pageshow');
  expect(s.state()).toMatchObject({ itemId: '10' });
});

test('lost access stops retrying, other failures retry with backoff', async () => {
  const denied = setup({ token: Promise.reject(Object.assign(new Error('gone'), { name: 'CollabAccessDenied' })) });
  await flush();
  expect(denied.timers).toEqual([]);
  expect(denied.forgotten).toEqual(['project:abc']);
  const flaky = setup({ token: Promise.reject(new Error('down')) });
  await flush();
  expect(flaky.timers.map(timer => timer.ms)).toEqual([1000]);
  const limited = setup();
  await flush();
  limited.providers[0].events.authenticationFailed({ reason: 'limit' });
  expect(limited.providers[0].destroyed).toBe(true);
  expect(limited.forgotten).toEqual([]);
  expect(limited.timers.map(timer => timer.ms)).toEqual([1000]);
});

test('the project structure written by the server reaches the editor', async () => {
  const s = setup();
  await flush();
  s.setStructure('{"version":2}');
  s.structureObservers.forEach(fn => fn());
  expect(s.structures).toEqual(['{"version":2}']);
});
