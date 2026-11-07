import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const s = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/structure.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: s, JSON, Object, Number, Array, Map, Set });

const dto = (version, { items = [[1, 'One'], [2, 'Two'], [3, 'Three']], trails = [[10, 'Trail', [1, 2]], [11, 'Other', [3]]], restoreEpoch = 0 } = {}) => ({
  version, restoreEpoch,
  items: items.map(([id, title, unfiled = false]) => ({ id, title, titleAlign: 'center', unfiled, words: 0, characters: 0 })),
  trails: trails.map(([id, title, itemIds]) => ({ id, title, description: null, version: 1, forkedFromId: null, itemIds })),
});
const base = s.toStructure(dto(1));
const order = (structure, trailId) => structure.trails.find(trail => trail.id === trailId).itemIds;

test('snapshots from the server are validated before use', () => {
  expect(s.parseStructure(JSON.stringify(dto(3)))).toEqual(s.toStructure(dto(3)));
  for (const raw of [undefined, 42, '{', 'null', '{"version":-1,"restoreEpoch":0,"items":[],"trails":[]}', '{"version":1,"restoreEpoch":0,"items":{},"trails":[]}']) {
    expect(s.parseStructure(raw)).toBeNull();
  }
  const hostile = JSON.parse(JSON.stringify(dto(3)));
  hostile.items.push({ id: '__proto__', title: 'x', unfiled: false, words: 0, characters: 0 }, { id: 9, title: 'x'.repeat(256), unfiled: false, words: 0, characters: 0 },
    { id: 8, title: 'bad align', titleAlign: 'justify', unfiled: false, words: 0, characters: 0 });
  hostile.trails.push({ id: 12, title: 'bad', version: 1, itemIds: ['x'] });
  const parsed = s.parseStructure(JSON.stringify(hostile));
  expect(Object.keys(parsed.items)).toEqual(['1', '2', '3']);
  expect(parsed.trails.map(trail => trail.id)).toEqual(['10', '11']);
});

test('every operation is idempotent and leaves untouched structures identical', () => {
  const ops = [
    s.renameItem('1', 'Renamed'), s.alignItem('1', 'left'), s.renameTrail('10', 'Renamed trail'),
    s.orderTrailItems('10', ['2', '1']), s.orderTrails(['11', '10']), s.addTrail({ id: '12', title: 'New', description: '', version: 1, forkedFrom: null, itemIds: [], steps: [] }),
    s.removeTrail('11'), s.linkItem('11', '1'), s.unlinkItem('10', '2'), s.addItem({ id: '4', title: 'Four', titleAlign: 'center', unfiled: false }, '10'),
    s.removeItem('2'),
  ];
  for (const op of ops) {
    const once = op(base);
    expect(once).not.toBe(base);
    expect(op(once)).toBe(once);
  }
  for (const op of [s.renameItem('1', 'One'), s.renameItem('missing', 'x'), s.orderTrailItems('10', ['1', '2']), s.linkItem('10', '1'), s.unlinkItem('11', '1'), s.removeItem('missing'), s.removeTrail('missing')]) {
    expect(op(base)).toBe(base);
  }
});

test('operations follow the server rules for trail membership', () => {
  expect(s.unlinkItem('11', '3')(base).items['3'].unfiled).toBe(true);
  expect(s.unlinkItem('10', '1')(s.linkItem('11', '1')(base)).items['1'].unfiled).toBe(false);
  expect(s.removeTrail('10')(base).items['1'].unfiled).toBe(true);
  expect(order(s.orderTrailItems('10', ['2', 'gone'])(base), '10')).toEqual(['2', '1']);
  expect(s.orderTrails(['11'])(base).trails.map(trail => trail.id)).toEqual(['11', '10']);
  const moved = s.compose(s.linkItem('11', '1'), s.orderTrailItems('11', ['1', '3']), s.unlinkItem('10', '1'))(base);
  expect(order(moved, '10')).toEqual(['2']);
  expect(order(moved, '11')).toEqual(['1', '3']);
  expect(s.removeItem('1')(base).trails.every(trail => !trail.itemIds.includes('1'))).toBe(true);
});

test('pending operations are layered over the remote structure and absorbed once the remote has them', () => {
  const rename = { key: 'title:1', apply: s.renameItem('1', 'Renamed') };
  const reorder = { key: 'order:10', apply: s.orderTrailItems('10', ['2', '1']) };
  const view = s.view(base, [rename, reorder]);
  expect(view.items['1'].title).toBe('Renamed');
  expect(order(view, '10')).toEqual(['2', '1']);
  expect(s.absorbed(rename, base)).toBe(false);
  const caughtUp = s.toStructure(dto(2, { items: [[1, 'Renamed'], [2, 'Two'], [3, 'Three']] }));
  expect(s.absorbed(rename, caughtUp)).toBe(true);
  expect(s.absorbed(reorder, caughtUp)).toBe(false);
});

test('navigation falls back when the open note or trail disappears', () => {
  const at = { itemId: '1', trailId: '10', request: { itemId: '1' } };
  expect(s.followNavigation(at, base)).toBe(at);
  expect(s.followNavigation(at, s.removeItem('1')(base))).toEqual({ itemId: '2', trailId: '10', request: undefined });
  expect(s.followNavigation({ itemId: '3', trailId: '11' }, s.removeItem('3')(base))).toEqual({ itemId: '1', trailId: '10', request: undefined });
  expect(s.followNavigation({ itemId: '1', trailId: '10' }, s.compose(s.linkItem('11', '1'), s.removeTrail('10'))(base))).toEqual({ itemId: '1', trailId: undefined });
});
