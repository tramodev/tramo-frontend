// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { Server, type Connection, type Document, type Hocuspocus } from '@hocuspocus/server';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import * as Y from 'yjs';
import { replaceContent, toLexical, toYjs } from './lexical';

type Context = { userId: number; perm: 'edit' | 'view'; sv: string | null };
type Claims = { iss?: string; aud?: string | string[]; sub?: string; item?: string; perm?: string; sv?: string | null; exp?: number };
type DocState = { epoch: number; author: number | null; bootstrapHash: string | null; poisoned: boolean };
type Bucket = { tokens: number; at: number };

function setting(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const apiUrl = setting('COLLAB_API_URL', 'http://127.0.0.1:8080');
const metricsSecret = process.env.COLLAB_METRICS_SECRET ?? '';
const secret = setting('COLLAB_INTERNAL_SECRET');
const tokenKey = Buffer.from(setting('COLLAB_TOKEN_SECRET'), 'base64');
const origins = new Set(setting('COLLAB_ALLOWED_ORIGINS', 'http://localhost:3000').split(','));
const limits = {
  messageBytes: Number(setting('COLLAB_MAX_MESSAGE_BYTES', String(256 * 1024))),
  socketsPerUser: Number(setting('COLLAB_MAX_SOCKETS_PER_USER', '10')),
  documentsPerSocket: Number(setting('COLLAB_MAX_DOCUMENTS_PER_SOCKET', '50')),
  perDocument: Number(setting('COLLAB_MAX_CONNECTIONS_PER_DOCUMENT', '25')),
  documents: Number(setting('COLLAB_MAX_DOCUMENTS', '500')),
  ratePerSecond: Number(setting('COLLAB_UPDATES_PER_SECOND', '30')),
  burst: Number(setting('COLLAB_UPDATES_BURST', '60')),
};

const documents = new Map<string, DocState>();
const buckets = new WeakMap<Connection, Bucket>();
const counters = new Map<string, number>();
const storeSeconds = { sum: 0, count: 0 };

function count(name: string, labels: Record<string, string | number> = {}) {
  const key = `${name}{${Object.entries(labels).map(([label, value]) => `${label}="${value}"`).join(',')}}`;
  counters.set(key, (counters.get(key) ?? 0) + 1);
}

function secretMatches(supplied: unknown, expected: string) {
  const given = Buffer.from(String(supplied ?? ''));
  const wanted = Buffer.from(expected);
  return wanted.length > 0 && given.length === wanted.length && timingSafeEqual(given, wanted);
}

function metrics(instance: Hocuspocus) {
  const open = connections(instance);
  const lines = [
    '# TYPE collab_connections gauge', `collab_connections ${open.length}`,
    '# TYPE collab_sockets gauge', `collab_sockets ${new Set(open.map(([, connection]) => connection.socketId)).size}`,
    '# TYPE collab_documents gauge', `collab_documents ${instance.documents.size}`,
    '# TYPE collab_store_duration_seconds summary',
    `collab_store_duration_seconds_sum ${storeSeconds.sum}`, `collab_store_duration_seconds_count ${storeSeconds.count}`,
  ];
  for (const name of new Set([...counters.keys()].map(key => key.slice(0, key.indexOf('{'))))) {
    lines.push(`# TYPE ${name} counter`);
    for (const [key, value] of counters) if (key.startsWith(`${name}{`)) lines.push(`${key.replace('{}', '')} ${value}`);
  }
  return `${lines.join('\n')}\n`;
}

const log = (event: string, fields: Record<string, unknown> = {}) =>
  console.log([`event=${event}`, ...Object.entries(fields).map(([key, value]) => `${key}=${value}`)].join(' '));

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function verify(token: string): Claims | null {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;
  try {
    if (JSON.parse(Buffer.from(header, 'base64url').toString()).alg !== 'HS256') return null;
    const expected = createHmac('sha256', tokenKey).update(`${header}.${payload}`).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Claims;
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== 'tramo-api' || !audience.includes('tramo-collab') || !claims.exp || claims.exp * 1000 <= Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

function api(path: string, init: RequestInit = {}) {
  return fetch(`${apiUrl}/internal/collab${path}`, {
    ...init,
    headers: { 'X-Collab-Secret': secret, 'Content-Type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(10_000),
  });
}

function reject(reason: string) {
  count('collab_rejections_total', { reason });
  return Object.assign(new Error(reason), { reason });
}

function connections(instance: Hocuspocus): Array<[Document, Connection<Context>]> {
  return [...instance.documents.values()].flatMap(document =>
    [...document.connections.keys()].map(connection => [document, connection as Connection<Context>] as [Document, Connection<Context>]));
}

function poison(instance: Hocuspocus, name: string) {
  const state = documents.get(name);
  if (state) state.poisoned = true;
  const document = instance.documents.get(name);
  if (!document) return;
  document.connections.forEach((_, connection) => connection.close({ code: 4000, reason: 'reload' }));
  if (document.getConnectionsCount() === 0) void instance.unloadDocument(document);
}

function revoke(instance: Hocuspocus, matches: (connection: Connection<Context>) => boolean) {
  for (const [document, connection] of connections(instance)) {
    if (matches(connection)) {
      log('collab_connection_revoked', { item: document.name, user: connection.context.userId });
      connection.close({ code: 4001, reason: 'revoked' });
    }
  }
}

function hasPendingImage(content: string) {
  return content.includes('"imageId":""');
}

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 64 * 1024) request.destroy();
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch (error) { reject(error); }
    });
    request.on('error', reject);
  });
}

async function restore(instance: Hocuspocus, name: string) {
  const document = instance.documents.get(name);
  const state = documents.get(name);
  if (!document || !state || state.poisoned) return;
  const response = await api(`/items/${name}`);
  if (response.status === 404) {
    count('collab_restores_total', { result: 'deleted' });
    state.poisoned = true;
    document.connections.forEach((_, connection) => connection.close({ code: 4002, reason: 'deleted' }));
    if (document.getConnectionsCount() === 0) void instance.unloadDocument(document);
    return;
  }
  if (!response.ok) throw new Error(`restore load failed with ${response.status}`);
  const loaded = await response.json() as { content: string; extractionEpoch: number };
  state.epoch = loaded.extractionEpoch;
  state.bootstrapHash = sha256(loaded.content);
  state.author = null;
  replaceContent(document, loaded.content);
  count('collab_restores_total', { result: 'applied' });
  log('collab_document_restored', { item: name, epoch: state.epoch });
}

async function store(document: Document, state: DocState, content = toLexical(document)) {
  if (state.poisoned || state.author === null) return true;
  if (hasPendingImage(content)) return true;
  const started = Date.now();
  const epoch = state.epoch;
  const response = await api(`/items/${document.name}`, {
    method: 'PUT',
    body: JSON.stringify({
      state: Buffer.from(Y.encodeStateAsUpdate(document)).toString('base64'),
      content,
      extractionEpoch: state.epoch,
      authorId: state.author,
      bootstrapHash: state.bootstrapHash,
    }),
  });
  log('collab_store', { item: document.name, status: response.status, ms: Date.now() - started });
  count('collab_stores_total', { status: response.status });
  storeSeconds.sum += (Date.now() - started) / 1000;
  storeSeconds.count += 1;
  if (state.epoch !== epoch) return true;
  if (response.ok) state.bootstrapHash = null;
  if (response.status === 200) {
    const sanitized = (await response.json() as { content?: unknown }).content;
    if (typeof sanitized === 'string') replaceContent(document, sanitized);
  }
  return response.ok || response.status >= 500;
}

const server = new Server<Context>({
  name: 'tramo-collab',
  port: Number(setting('COLLAB_PORT', '1234')),
  address: setting('COLLAB_ADDRESS', '127.0.0.1'),
  quiet: true,
  debounce: 2000,
  maxDebounce: 10_000,
  unloadImmediately: false,
  websocketOptions: { maxPayload: limits.messageBytes },

  async onAuthenticate({ token, documentName, connectionConfig, requestHeaders, socketId, instance }) {
    const origin = requestHeaders.get('origin');
    const claims = verify(token);
    if ((origin && !origins.has(origin)) || !claims || claims.item !== documentName || !claims.sub) throw reject('forbidden');
    if (documents.get(documentName)?.poisoned) throw reject('reload');
    const userId = Number(claims.sub);
    const mine = connections(instance).filter(([, connection]) => connection.context.userId === userId).map(([, connection]) => connection.socketId);
    const sockets = new Set(mine);
    if ((!sockets.has(socketId) && sockets.size >= limits.socketsPerUser)
        || mine.filter(id => id === socketId).length >= limits.documentsPerSocket
        || (instance.documents.get(documentName)?.getConnectionsCount() ?? 0) >= limits.perDocument
        || (!instance.documents.has(documentName) && instance.documents.size >= limits.documents)) {
      log('collab_rejected_limit', { item: documentName, user: userId });
      throw reject('limit');
    }
    connectionConfig.readOnly = claims.perm !== 'edit';
    return { userId, perm: claims.perm === 'edit' ? 'edit' : 'view', sv: claims.sv ?? null };
  },

  async onLoadDocument({ documentName, document, context }) {
    const response = await api(`/items/${documentName}`);
    if (!response.ok) throw new Error(`load failed with ${response.status}`);
    const loaded = await response.json() as { state: string | null; content: string; extractionEpoch: number };
    const state: DocState = { epoch: loaded.extractionEpoch, author: null, bootstrapHash: null, poisoned: false };
    if (loaded.state) {
      Y.applyUpdate(document, Buffer.from(loaded.state, 'base64'));
    } else {
      Y.applyUpdate(document, toYjs(loaded.content));
      state.bootstrapHash = sha256(loaded.content);
      if (context.perm === 'edit') {
        state.author = context.userId;
        if (!await store(document, state, loaded.content)) throw new Error('bootstrap rejected');
        state.author = null;
      }
    }
    documents.set(documentName, state);
    log('collab_document_loaded', { item: documentName, bootstrapped: !loaded.state });
  },

  async beforeHandleMessage({ connection }) {
    const now = Date.now();
    const bucket = buckets.get(connection) ?? { tokens: limits.burst, at: now };
    bucket.tokens = Math.min(limits.burst, bucket.tokens + (now - bucket.at) * limits.ratePerSecond / 1000);
    bucket.at = now;
    buckets.set(connection, bucket);
    if (bucket.tokens < 1) {
      log('collab_rejected_limit', { reason: 'rate', user: connection.context.userId });
      count('collab_rejections_total', { reason: 'rate' });
      throw Object.assign(new Error('rate'), { code: 1008, reason: 'rate-limited' });
    }
    bucket.tokens -= 1;
  },

  async onChange({ documentName, context, connection }) {
    const state = documents.get(documentName);
    if (state && connection && context.perm === 'edit') state.author = context.userId;
  },

  async onStoreDocument({ documentName, document, instance }) {
    const state = documents.get(documentName);
    if (!state) return;
    try {
      if (!await store(document, state)) poison(instance, documentName);
    } catch (error) {
      log('collab_store_failed', { item: documentName, error: (error as Error).message });
    }
  },

  async afterUnloadDocument({ documentName }) {
    documents.delete(documentName);
  },

  async onRequest({ request, response, instance }) {
    const path = new URL(request.url ?? '/', 'http://collab').pathname;
    if (request.method === 'GET' && path === '/metrics') {
      if (!secretMatches(request.headers['x-metrics-secret'], metricsSecret)) response.writeHead(404).end();
      else response.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' }).end(metrics(instance));
      return Promise.reject();
    }
    if (request.method !== 'POST' || !['/internal/revoke', '/internal/reset'].includes(path)) return;
    if (!secretMatches(request.headers['x-collab-secret'], secret)) {
      response.writeHead(403).end();
      return Promise.reject();
    }
    const body = await readBody(request).catch(() => null) as { userId?: number; itemIds?: number[] } | null;
    if (path === '/internal/revoke' && typeof body?.userId === 'number') {
      revoke(instance, connection => connection.context.userId === body.userId);
    } else if (path === '/internal/reset' && Array.isArray(body?.itemIds)) {
      await Promise.all(body.itemIds.map(id => restore(instance, String(id)).catch(error => {
        log('collab_restore_failed', { item: id, error: (error as Error).message });
        count('collab_restores_total', { result: 'failed' });
        poison(instance, String(id));
      })));
    } else {
      response.writeHead(400).end();
      return Promise.reject();
    }
    response.writeHead(204).end();
    return Promise.reject();
  },
});

setInterval(async () => {
  const open = connections(server.hocuspocus);
  if (!open.length) return;
  try {
    const response = await api('/check', {
      method: 'POST',
      body: JSON.stringify(open.map(([document, connection]) => ({
        userId: connection.context.userId, itemId: Number(document.name), sv: connection.context.sv, perm: connection.context.perm,
      }))),
    });
    if (!response.ok) throw new Error(`check failed with ${response.status}`);
    const invalid = new Set(await response.json() as number[]);
    const stale = new Set(open.filter((_, index) => invalid.has(index)).map(([, connection]) => connection));
    revoke(server.hocuspocus, connection => stale.has(connection));
  } catch (error) {
    log('collab_check_failed', { error: (error as Error).message });
  }
}, 60_000).unref();

await server.listen();
log('collab_listening', { port: server.configuration.port });
