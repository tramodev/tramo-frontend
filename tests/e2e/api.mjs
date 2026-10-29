import { createServer } from 'node:http';

const profile = { userId: '1', username: 'embedtester', email: 'embed@example.test', birthDate: '1990-01-01', role: 'USER', imageUrl: null };
const now = new Date().toISOString();
const project = { id: 'embeds', title: 'Embed tests', description: 'Browser regression fixture', tags: [], visibility: 'private', restoreEpoch: 0, thumbnailImageUrl: null, creationDate: now, modifiedDate: now, storageBytes: 0 };
const item = { id: 1, title: 'Note', titleAlign: 'left', unfiled: true, type: null };
let content = '', published = 0, saves = 0, creations = 0;
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:3180');
  const path = url.pathname;
  let raw = '';
  for await (const chunk of request) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const send = (value, status = 200) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(value)); };
  if (path === '/health') return send({ ok: true });
  if (path === '/fixture' && request.method === 'POST') {
    content = body.content ?? '';
    project.visibility = body.visibility ?? 'private';
    published = saves = creations = 0;
    return send({ ok: true });
  }
  if (path === '/fixture') return send({ content, published, saves, creations });
  if (path === '/api/profile/me') return send(profile);
  if (path === '/api/project/embeds/editor') return send({ ...project, trails: [], items: [{ ...item, words: 0, characters: 0 }], selectedItemId: 1, selectedTrailId: null, contents: [{ id: 1, content, extractionEpoch: 0 }], username: profile.username, imageUrl: null });
  if (path === '/api/project/embeds') return send(project);
  if (path === '/api/project') return send([project]);
  if (path === '/api/project/embeds/trail') return send([]);
  if (path === '/api/project/embeds/item') return send([item]);
  if (path === '/api/project/embeds/text-stats') return send({ words: 0, characters: 0, items: [{ id: 1, words: 0, characters: 0 }] });
  if (path === '/api/project/embeds/map-previews') return send({});
  if (path === '/api/project/embeds/publish') { project.visibility = 'published'; published++; return send(project); }
  if (path === '/api/item/1/content') {
    if (request.method === 'PUT') { content = body.content; saves++; response.writeHead(204); return response.end(); }
    return send({ content, extractionEpoch: 0 });
  }
  if (path === '/api/project/draft-commit') {
    content = body.snapshot?.item?.content ?? body.item?.content ?? '';
    creations++;
    return send({ projectId: 'embeds', trailId: null, itemId: 1, restoreEpoch: 0, projectTitle: project.title, trailTitle: 'Trail', itemTitle: item.title });
  }
  if (path === '/api/public/project/embeds') return send({ ...project, ownerUsername: 'embedtester', trails: [], looseItems: [{ ...item, content }], voteCount: 0, viewCount: 0, commentCount: 0, canFork: false, canComment: false, votedByRequester: false, bookmarkedByRequester: false });
  if (path.endsWith('/history')) return send({ versions: [], nextCursor: null, unavailable: false });
  if (path.endsWith('/unread-count')) return send({ count: 0 });
  if (path.endsWith('/storage')) return send({ storageUsedBytes: 0, storageImageBytes: 0, storageTextBytes: 0 });
  if (path.endsWith('/comments')) return send({ content: [], totalElements: 0, totalPages: 0 });
  return send([]);
});
server.listen(3180, '127.0.0.1');
