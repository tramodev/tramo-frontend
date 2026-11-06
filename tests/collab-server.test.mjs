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
const deleted = new Set();
const failures = new Map();
const apiRequests = [];
const forbiddenAuthors = new Set();
const SAFE = JSON.stringify({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'label' }] }] } });

function freePort() {
  return new Promise(resolve => {
    const probe = createServer().listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function sign(claims, expiresIn = 120) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'HS256' })}.${encode({ iss: 'tramo-api', aud: ['tramo-collab'], sv: null, exp: Math.floor(Date.now() / 1000) + expiresIn, ...claims })}`;
  return `${body}.${createHmac('sha256', TOKEN_KEY).update(body).digest('base64url')}`;
}

function token(item, user, perm, expiresIn = 120) {
  return sign({ sub: String(user), item: String(item), perm }, expiresIn);
}

function presence(project, user, role, options = {}) {
  const perm = role === 'VIEWER' ? 'view' : 'edit';
  return connect(`project-${project}`, user, perm, { ...options, provider: { token: sign({ sub: String(user), project: String(project), perm, role, name: `user${user}` }), ...options.provider } });
}

function connect(item, user, perm, options = {}) {
  const websocketProvider = options.socket ?? new HocuspocusProviderWebsocket({ url: `ws://127.0.0.1:${port}`, maxAttempts: 1 });
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
      apiRequests.push(request.url);
      const id = request.url.match(/items\/(\d+)/)?.[1];
      if (request.headers['x-collab-secret'] !== SECRET) return response.writeHead(403).end();
      if (request.method === 'GET' && id && deleted.has(id)) return response.writeHead(404).end();
      if (request.method === 'GET' && id) {
        const item = items.get(id) ?? { state: null, content: '', extractionEpoch: 0 };
        return response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(item));
      }
      if (request.method === 'PUT' && id && failures.get(id) > 0) {
        failures.set(id, failures.get(id) - 1);
        return response.writeHead(503).end();
      }
      if (request.method === 'PUT' && id && forbiddenAuthors.has(JSON.parse(body).authorId)) return response.writeHead(403).end();
      if (request.method === 'PUT' && id) {
        const stored = JSON.parse(body);
        stores.push({ id, ...stored });
        if (stored.content.includes('javascript:')) {
          items.set(id, { state: stored.state, content: SAFE, extractionEpoch: stored.extractionEpoch });
          return response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ content: SAFE }));
        }
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
      COLLAB_MAX_SOCKETS_PER_USER: '2',
      COLLAB_METRICS_SECRET: 'test-metrics-secret',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve, reject) => {
    sidecar.stdout.on('data', chunk => { if (String(chunk).includes('collab_listening')) resolve(); });
    sidecar.once('exit', code => reject(new Error(`sidecar exited with ${code}`)));
  });
}, 60000);

afterAll(async () => {
  const exited = sidecar && sidecar.exitCode === null ? new Promise(resolve => sidecar.once('exit', resolve)) : null;
  sidecar?.kill();
  api?.close();
  await exited;
}, 10000);

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

test('the connection limit counts tabs, not the notes open in each tab', async () => {
  const first = connect(91, 90, 'edit');
  const sameTab = [92, 93, 94].map(item => connect(item, 90, 'edit', { socket: first.configuration.websocketProvider }));
  const second = connect(95, 90, 'edit');
  await until(() => [first, ...sameTab, second].every(provider => provider.synced));
  const reasons = [];
  const third = connect(96, 90, 'edit', { provider: { onAuthenticationFailed: ({ reason }) => reasons.push(reason) } });
  await until(() => reasons.length === 1);
  expect(reasons).toEqual(['limit']);
  sameTab.forEach(provider => provider.destroy());
  close(first, second, third);
}, 30000);

test('rejected authentication tells the client why', async () => {
  const reasons = [];
  const provider = connect(8, 80, 'edit', { provider: { token: token(9, 80, 'edit'), onAuthenticationFailed: ({ reason }) => reasons.push(reason) } });
  await until(() => reasons.length === 1);
  expect(reasons).toEqual(['forbidden']);
  close(provider);
}, 30000);

test('revoke closes connections with the reason the client acts on', async () => {
  const revoked = connect(6, 60, 'edit');
  await until(() => revoked.synced);
  const reasons = [];
  revoked.on('close', ({ event }) => reasons.push(event.reason));
  expect((await fetch(`http://127.0.0.1:${port}/internal/revoke`, { method: 'POST', body: '{"userId":60}' })).status).toBe(403);
  expect((await internal('/internal/revoke', { userId: 60 })).status).toBe(204);
  await until(() => reasons.length === 1);
  expect(reasons).toEqual(['revoked']);
  close(revoked);
}, 30000);

test('a restore reaches open editors as a live update and closes notes it deleted', async () => {
  items.set('7', { state: null, content: NOTE, extractionEpoch: 0 });
  const kept = connect(7, 70, 'edit');
  const removed = connect(17, 70, 'edit');
  await until(() => kept.synced && removed.synced);
  const closes = [];
  kept.on('close', ({ event }) => closes.push(['kept', event.reason]));
  removed.on('close', ({ event }) => closes.push(['removed', event.reason]));
  items.set('7', { state: null, content: SAFE, extractionEpoch: 1 });
  deleted.add('17');
  expect((await internal('/internal/reset', { itemIds: [7, 17] })).status).toBe(204);
  await until(() => lexical.toLexical(kept.document).includes('"label"') && closes.length === 1);
  expect(closes).toEqual([['removed', 'deleted']]);
  kept.document.getMap('probe').set('after', 'restore');
  const stored = await until(() => stores.find(store => store.id === '7' && store.extractionEpoch === 1), 15000);
  expect(stored.bootstrapHash).toBeTruthy();
  expect(stored.content).toContain('"label"');
  close(kept, removed);
}, 30000);

test('links the API strips are removed from the live document too', async () => {
  items.set('18', { state: null, content: SAFE, extractionEpoch: 0 });
  const author = connect(18, 81, 'edit');
  await until(() => author.synced);
  const unsafe = JSON.stringify({ root: { type: 'root', children: [{ type: 'paragraph', children: [
    { type: 'link', url: 'javascript:alert(1)', children: [{ type: 'text', text: 'label' }] },
  ] }] } });
  lexical.replaceContent(author.document, unsafe);
  await until(() => stores.some(store => store.id === '18' && store.content.includes('javascript:')), 15000);
  await until(() => !lexical.toLexical(author.document).includes('javascript:'), 15000);
  close(author);
}, 30000);

test('edits survive an API outage after the last editor leaves', async () => {
  items.set('31', { state: null, content: SAFE, extractionEpoch: 0 });
  const author = connect(31, 310, 'edit');
  await until(() => author.synced);
  await until(() => stores.some(store => store.id === '31'));
  failures.set('31', 2);
  const edited = JSON.stringify({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'written before closing' }] }] } });
  lexical.replaceContent(author.document, edited);
  await until(() => author.unsyncedChanges === 0);
  close(author);
  const stored = await until(() => stores.find(store => store.id === '31' && store.content.includes('written before closing')), 25000);
  expect(failures.get('31')).toBe(0);
  expect(stored.authorId).toBe(310);
}, 40000);

test('an image left uploading by a closed tab is dropped so the rest of the note is saved', async () => {
  items.set('32', { state: null, content: SAFE, extractionEpoch: 0 });
  const author = connect(32, 320, 'edit');
  await until(() => author.synced);
  await until(() => stores.some(store => store.id === '32'));
  const withUpload = JSON.stringify({ root: { type: 'root', children: [
    { type: 'paragraph', children: [{ type: 'text', text: 'kept text' }] },
    { type: 'image', imageId: '', altText: 'uploading' },
  ] } });
  lexical.replaceContent(author.document, withUpload);
  await until(() => author.unsyncedChanges === 0);
  close(author);
  const stored = await until(() => stores.find(store => store.id === '32' && store.content.includes('kept text')), 25000);
  expect(stored.content).not.toContain('"imageId":""');
}, 40000);

test('project members see each other through presence with identity taken from the token', async () => {
  const owner = presence(41, 410, 'OWNER');
  const viewer = presence(41, 411, 'VIEWER');
  await until(() => owner.synced && viewer.synced);
  owner.setAwarenessField('user', { id: '999', name: 'Owner', imageUrl: 'https://evil.example/x.png' });
  owner.setAwarenessField('typingAt', 1);
  viewer.setAwarenessField('user', { id: '410', name: 'user410' });
  viewer.setAwarenessField('role', 'OWNER');
  viewer.setAwarenessField('typingAt', 1);
  const peer = (provider, id) => [...provider.awareness.getStates().values()].find(state => state.user?.id === id);
  const seenOwner = await until(() => peer(viewer, '410')?.typingAt === 1 && peer(viewer, '410'));
  const seenViewer = await until(() => peer(owner, '411')?.typingAt === null && peer(owner, '411'));
  expect(seenOwner).toMatchObject({ user: { id: '410', name: 'user410' }, role: 'OWNER', typingAt: 1 });
  expect(seenOwner.user.imageUrl).toBeFalsy();
  expect(seenViewer).toMatchObject({ user: { id: '411', name: 'user411' }, role: 'VIEWER', typingAt: null });
  owner.document.getMap('probe').set('from', 'owner');
  await new Promise(resolve => setTimeout(resolve, 300));
  expect(viewer.document.getMap('probe').get('from')).toBeUndefined();
  expect(apiRequests.filter(url => url.includes('/items/41') || url.includes('project-'))).toEqual([]);
  const metrics = await (await fetch(`http://127.0.0.1:${port}/metrics`, { headers: { 'X-Metrics-Secret': 'test-metrics-secret' } })).text();
  expect(metrics).toMatch(/^collab_presence_documents 1$/m);
  close(owner, viewer);
}, 30000);

test('presence rejects tokens for another project or for a note', async () => {
  const reasons = [];
  const onAuthenticationFailed = ({ reason }) => reasons.push(reason);
  const otherProject = presence(42, 420, 'EDITOR', { provider: { token: sign({ sub: '420', project: '43', perm: 'edit', role: 'EDITOR' }), onAuthenticationFailed } });
  const noteToken = presence(42, 421, 'EDITOR', { provider: { token: token(42, 421, 'edit'), onAuthenticationFailed } });
  await until(() => reasons.length === 2);
  expect(reasons).toEqual(['forbidden', 'forbidden']);
  close(otherProject, noteToken);
}, 30000);

test('revoke closes presence too', async () => {
  const member = presence(44, 440, 'EDITOR');
  await until(() => member.synced);
  const reasons = [];
  member.on('close', ({ event }) => reasons.push(event.reason));
  expect((await internal('/internal/revoke', { userId: 440 })).status).toBe(204);
  await until(() => reasons.length === 1);
  expect(reasons).toEqual(['revoked']);
  close(member);
}, 30000);

test('metrics are served in Prometheus format only with the metrics secret', async () => {
  expect((await fetch(`http://127.0.0.1:${port}/metrics`)).status).toBe(404);
  expect((await fetch(`http://127.0.0.1:${port}/metrics`, { headers: { 'X-Metrics-Secret': SECRET } })).status).toBe(404);
  const response = await fetch(`http://127.0.0.1:${port}/metrics`, { headers: { 'X-Metrics-Secret': 'test-metrics-secret' } });
  const body = await response.text();
  expect(response.status).toBe(200);
  expect(body).toMatch(/^collab_connections \d+$/m);
  expect(body).toContain('collab_rejections_total{reason="forbidden"}');
  expect(body).toContain('collab_restores_total{result="applied"} 1');
  expect(body).toMatch(/^collab_stores_total\{status="204"\} \d+$/m);
  expect(body).toMatch(/^collab_store_retries_total \d+$/m);
});

test('a note remounted with a new provider while the old one was still authenticating syncs', async () => {
  items.set('52', { state: null, content: SAFE, extractionEpoch: 0 });
  const websocketProvider = new HocuspocusProviderWebsocket({ url: `ws://127.0.0.1:${port}`, maxAttempts: 1 });
  const first = new HocuspocusProvider({ websocketProvider, name: '52', document: new Y.Doc(), token: token(52, 520, 'edit'), sessionAwareness: true });
  first.attach();
  first.destroy();
  const second = new HocuspocusProvider({ websocketProvider, name: '52', document: new Y.Doc(), token: token(52, 520, 'edit'), sessionAwareness: true });
  second.attach();
  await until(() => second.synced && second.unsyncedChanges === 0);
  close(second);
}, 30000);

test('an edit by someone who lost edit access is saved by another editor instead of forcing a reload', async () => {
  items.set('53', { state: null, content: SAFE, extractionEpoch: 0 });
  const demoted = connect(53, 530, 'edit');
  const staying = connect(53, 531, 'edit');
  await until(() => demoted.synced && staying.synced);
  const closes = [];
  staying.on('close', ({ event }) => closes.push(event.reason));
  forbiddenAuthors.add(530);
  demoted.document.getMap('probe').set('from', 'demoted');
  const saved = store => {
    const persisted = new Y.Doc();
    Y.applyUpdate(persisted, Buffer.from(store.state, 'base64'));
    return persisted.getMap('probe').get('from') === 'demoted';
  };
  const stored = await until(() => stores.find(store => store.id === '53' && saved(store)), 15000);
  expect(stored.authorId).toBe(531);
  expect(closes).toEqual([]);
  close(demoted, staying);
}, 30000);

test('with no other editor left a rejected edit still asks to reload', async () => {
  items.set('54', { state: null, content: SAFE, extractionEpoch: 0 });
  const demoted = connect(54, 540, 'edit');
  await until(() => demoted.synced);
  const closes = [];
  demoted.on('close', ({ event }) => closes.push(event.reason));
  forbiddenAuthors.add(540);
  demoted.document.getMap('probe').set('from', 'demoted');
  await until(() => closes.includes('reload'), 15000);
  close(demoted);
}, 30000);
