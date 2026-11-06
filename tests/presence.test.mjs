import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/presence.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, URL, Number, Math, Map, Set, require: () => ({ publicImageOrigins: ['https://img.example'] }) });
const { presencePeers, presenceStatus, parsePresence } = exports;

const NOW = 1_000_000_000;
const state = (id, name, fields = {}) => ({
  user: { id, name, imageUrl: null }, role: 'EDITOR', itemId: '7', trailId: '3', typingAt: null, activeAt: NOW - 1000, hidden: false, ...fields,
});

test('status is writing, viewing or idle and expires with the clock', () => {
  const typing = parsePresence(state('1', 'Ana', { typingAt: NOW - 1000 }));
  expect(presenceStatus(typing, NOW)).toBe('writing');
  expect(presenceStatus(typing, NOW + 10_000)).toBe('viewing');
  expect(presenceStatus(typing, NOW + 5 * 60_000)).toBe('idle');
  expect(presenceStatus(parsePresence(state('1', 'Ana', { typingAt: NOW, hidden: true })), NOW)).toBe('idle');
});

test('viewers never show as writing', () => {
  const viewer = parsePresence(state('2', 'Bo', { role: 'VIEWER', typingAt: NOW }));
  expect(viewer.typingAt).toBeNull();
  expect(presenceStatus({ ...viewer, typingAt: NOW }, NOW)).toBe('viewing');
});

test('tabs of one person collapse to the most active one and I come first', () => {
  const peers = presencePeers([
    state('5', 'Zoe', { activeAt: NOW - 2000 }),
    state('9', 'Me'),
    state('5', 'Zoe', { typingAt: NOW - 500, activeAt: NOW - 3000, itemId: '8' }),
    state('4', 'Al', { activeAt: NOW - 9000 }),
    state('4', 'Al', { activeAt: NOW - 100, itemId: '11' }),
  ], '9', NOW);
  expect(peers.map(peer => [peer.user.name, peer.self, peer.status, peer.itemId])).toEqual([
    ['Me', true, 'viewing', '7'], ['Al', false, 'viewing', '11'], ['Zoe', false, 'writing', '8'],
  ]);
});

test('the order of others does not follow activity', () => {
  const quiet = presencePeers([state('2', 'Bea'), state('3', 'Cy', { typingAt: NOW })], '1', NOW);
  const busy = presencePeers([state('3', 'Cy'), state('2', 'Bea', { typingAt: NOW })], '1', NOW);
  expect(quiet.map(peer => peer.user.name)).toEqual(['Bea', 'Cy']);
  expect(busy.map(peer => peer.user.name)).toEqual(['Bea', 'Cy']);
});

test('awareness from other clients is validated', () => {
  expect(parsePresence(state('1', 'A', { role: 'ADMIN' }))).toBeNull();
  expect(parsePresence({ ...state('1', 'A'), user: { id: 'x', name: 'A' } })).toBeNull();
  const odd = parsePresence(state('1', 'A'.repeat(200), { itemId: '__proto__', trailId: 4, hidden: 'yes' }));
  expect([odd.user.name.length, odd.itemId, odd.trailId, odd.hidden]).toEqual([64, null, null, false]);
  expect(parsePresence({ ...state('1', 'A'), user: { id: '1', name: 'A', imageUrl: 'https://evil.example/a.png' } }).user.imageUrl).toBeNull();
  expect(parsePresence({ ...state('1', 'A'), user: { id: '1', name: 'A', imageUrl: 'https://img.example/a.png' } }).user.imageUrl).toBe('https://img.example/a.png');
});
