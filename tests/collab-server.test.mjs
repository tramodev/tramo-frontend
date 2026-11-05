import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { execFileSync, spawn } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { isDeepStrictEqual } from 'node:util';
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import * as Y from 'yjs';

const SECRET = 'test-collab-secret';
const TOKEN_KEY = Buffer.alloc(32, 7);
const NOTE = JSON.stringify({ root: { type: 'root', children: [
  { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Title', format: 1 }] },
  { type: 'paragraph', children: [
    { type: 'text', text: 'plain ' },
    { type: 'link', url: 'https://example.com', children: [{ type: 'text', text: 'link' }] },
    { type: 'link', url: '#', rel: 'tramo-idea:12', children: [{ type: 'text', text: 'idea' }] },
  ] },
  { type: 'quote', children: [{ type: 'text', text: 'quoted', format: 2 }] },
  { type: 'list', listType: 'check', tag: 'ul', start: 1, children: [
    { type: 'listitem', checked: true, value: 1, children: [{ type: 'text', text: 'done' }] },
    { type: 'listitem', checked: false, value: 2, children: [{ type: 'text', text: 'todo' }] },
  ] },
  { type: 'code', language: 'js', children: [{ type: 'code-highlight', text: 'const x = 1;' }] },
  { type: 'image', imageId: randomUUID(), altText: 'alt', caption: 'cap' },
  { type: 'equation', equation: 'x^2', inline: false },
  { type: 'music', abc: 'X:1\nK:C\nCDEF|' },
  { type: 'embed', provider: 'youtube', id: 'dQw4w9WgXcQ' },
  { type: 'horizontalrule' },
  { type: 'table', children: [{ type: 'tablerow', children: [
    { type: 'tablecell', headerState: 1, children: [{ type: 'paragraph', children: [{ type: 'text', text: 'cell' }] }] },
  ] }] },
] } });

let api;
let sidecar;
let port;
let lexical;
const items = new Map();
const stores = [];

function freePort() {
  return new Promise(resolve => {
    const probe = createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function token(item, user, perm, expiresIn = 120) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'HS256' })}.${encode({ iss: 'tramo-api', aud: ['tramo-collab'], sub: String(user), item: String(item), perm, sv: null, exp: Math.floor(Date.now() / 1000) + expiresIn })}`;
  return `${body}.${createHmac('sha256', TOKEN_KEY).update(body).digest('base64url')}`;
}

function connect(item, user, perm, options = {}) {
  const websocketProvider = new HocuspocusProviderWebsocket({ url: `ws://127.0.0.1:${port}`, maxAttempts: 1 });
  const provider = new HocuspocusProvider({ websocketProvider, name: String(item), document: new Y.Doc(), token: token(item, user, perm, options.expiresIn), ...options.provider });
  provider.attach();
  return provider;
}

function close(...providers) {
  providers.forEach(provider => {
    provider.destroy();
    provider.configuration.websocketProvider.destroy();
  });
}

function until(check, timeout = 8000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const value = check();
      if (value) resolve(value);
      else if (Date.now() - started > timeout) reject(new Error('timed out'));
      else setTimeout(tick, 25);
    };
    tick();
  });
}

function internal(path, body) {
  return fetch(`http://127.0.0.1:${port}${path}`, { method: 'POST', headers: { 'X-Collab-Secret': SECRET }, body: JSON.stringify(body) });
}

beforeAll(async () => {
  execFileSync('node', ['collab/build.mjs', 'collab/server.ts', 'collab/lexical.ts']);
  lexical = await import('../collab/dist/lexical.mjs');
  api = createServer((request, response) => {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      const id = request.url.match(/items\/(\d+)/)?.[1];
      if (request.headers['x-collab-secret'] !== SECRET) return response.writeHead(403).end();
      if (request.method === 'GET' && id) {
        const item = items.get(id) ?? { state: null, content: '', extractionEpoch: 0 };
        return response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(item));
      }
      if (request.method === 'PUT' && id) {
        const stored = JSON.parse(body);
        stores.push({ id, ...stored });
        items.set(id, { state: stored.state, content: stored.content, extractionEpoch: stored.extractionEpoch });
        return response.writeHead(204).end();
      }
      if (request.url.endsWith('/check')) return response.writeHead(200, { 'Content-Type': 'application/json' }).end('[]');
      response.writeHead(404).end();
    });
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => api.once('listening', resolve));
  port = await freePort();
  sidecar = spawn('node', ['collab/dist/server.mjs'], {
    env: {
      ...process.env,
      COLLAB_API_URL: `http://127.0.0.1:${api.address().port}`,
      COLLAB_INTERNAL_SECRET: SECRET,
      COLLAB_TOKEN_SECRET: TOKEN_KEY.toString('base64'),
      COLLAB_PORT: String(port),
      COLLAB_MAX_MESSAGE_BYTES: String(64 * 1024),
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve, reject) => {
    sidecar.stdout.on('data', chunk => { if (String(chunk).includes('collab_listening')) resolve(); });
    sidecar.once('exit', code => reject(new Error(`sidecar exited with ${code}`)));
  });
}, 60000);

afterAll(() => {
  sidecar?.kill();
  api?.close();
});

test('every editor node survives the JSON to Yjs round trip', () => {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, lexical.toYjs(NOTE));
  expect(isDeepStrictEqual(JSON.parse(lexical.toLexical(doc)), JSON.parse(lexical.canonicalize(NOTE)))).toBe(true);
});

test('legacy notes missing default keys are canonicalized, never overwritten', () => {
  const legacy = JSON.parse(lexical.canonicalize(JSON.stringify({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'a', format: 1 }] }] } })));
  const paragraph = legacy.root.children[0];
  expect(paragraph).toHaveProperty('direction');
  expect(paragraph).toHaveProperty('textFormat');
  expect(paragraph.children[0].format).toBe(1);
});

test('editors converge, the server bootstraps from JSON and persists as the editing author', async () => {
  items.set('1', { state: null, content: NOTE, extractionEpoch: 3 });
  const first = connect(1, 10, 'edit');
  const second = connect(1, 11, 'edit');
  await until(() => first.synced && second.synced);
  const bootstrap = await until(() => stores.find(store => store.id === '1' && store.bootstrapHash));
  expect(bootstrap.content).toBe(NOTE);
  expect(bootstrap.extractionEpoch).toBe(3);
  expect(isDeepStrictEqual(JSON.parse(lexical.toLexical(second.document)), JSON.parse(lexical.canonicalize(NOTE)))).toBe(true);
  first.document.getMap('probe').set('from', 'first');
  await until(() => second.document.getMap('probe').get('from') === 'first');
  const stored = await until(() => stores.find(store => store.id === '1' && !store.bootstrapHash && store.authorId === 10), 15000);
  const persisted = new Y.Doc();
  Y.applyUpdate(persisted, Buffer.from(stored.state, 'base64'));
  expect(persisted.getMap('probe').get('from')).toBe('first');
  close(first, second);
}, 30000);

test('viewers receive edits but cannot write', async () => {
  const editor = connect(2, 20, 'edit');
  const viewer = connect(2, 21, 'view');
  await until(() => editor.synced && viewer.synced);
  viewer.document.getMap('probe').set('from', 'viewer');
  editor.document.getMap('probe').set('other', 'editor');
  await until(() => viewer.document.getMap('probe').get('other') === 'editor');
  await new Promise(resolve => setTimeout(resolve, 300));
  expect(editor.document.getMap('probe').get('from')).toBeUndefined();
  close(editor, viewer);
}, 30000);

test('expired or forged tokens are rejected', async () => {
  const failures = [];
  const expired = connect(3, 30, 'edit', { expiresIn: -10, provider: { onAuthenticationFailed: () => failures.push('expired') } });
  const forged = connect(3, 31, 'edit', { provider: { token: `${token(3, 31, 'edit').slice(0, -2)}xx`, onAuthenticationFailed: () => failures.push('forged') } });
  const wrongItem = connect(3, 32, 'edit', { provider: { token: token(4, 32, 'edit'), onAuthenticationFailed: () => failures.push('item') } });
  await until(() => failures.length === 3);
  expect(failures.sort()).toEqual(['expired', 'forged', 'item']);
  close(expired, forged, wrongItem);
}, 30000);

test('oversized messages close the socket', async () => {
  const provider = connect(5, 50, 'edit');
  await until(() => provider.synced);
  const closed = new Promise(resolve => provider.configuration.websocketProvider.on('disconnect', resolve));
  provider.document.getMap('probe').set('big', 'x'.repeat(128 * 1024));
  await closed;
  close(provider);
}, 30000);

test('revoke and reset close connections with the reason the client acts on', async () => {
  const revoked = connect(6, 60, 'edit');
  const reset = connect(7, 70, 'edit');
  await until(() => revoked.synced && reset.synced);
  const reasons = [];
  revoked.on('close', ({ event }) => reasons.push(event.reason));
  reset.on('close', ({ event }) => reasons.push(event.reason));
  expect((await fetch(`http://127.0.0.1:${port}/internal/revoke`, { method: 'POST', body: '{"userId":60}' })).status).toBe(403);
  expect((await internal('/internal/revoke', { userId: 60 })).status).toBe(204);
  expect((await internal('/internal/reset', { itemIds: [7] })).status).toBe(204);
  await until(() => reasons.length === 2);
  expect(reasons.sort()).toEqual(['reload', 'revoked']);
  close(revoked, reset);
}, 30000);
