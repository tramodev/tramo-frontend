import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/plugins/TypeaheadMenu.tsx', 'utf8') + '\nexport { menuPosition };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: () => ({}) });
const { menuPosition } = exports;

test('a menu near the bottom opens above the caret and stays inside the viewport', () => {
  const placed = menuPosition({ top: 590, bottom: 610, left: 330 }, 200, 600, { top: 0, left: 0, width: 375, height: 667 });
  expect(placed).toEqual({ top: 346, left: 167, maxHeight: 240 });
});

test('the menu uses available space when neither side can fit its full height', () => {
  const placed = menuPosition({ top: 170, bottom: 190, left: 40 }, 200, 600, { top: 0, left: 0, width: 844, height: 390 });
  expect(placed).toEqual({ top: 194, left: 40, maxHeight: 188 });
  expect(placed.top + placed.maxHeight).toBeLessThanOrEqual(390 - 8);
});

test('a keyboard-reduced visual viewport limits and flips the menu', () => {
  const placed = menuPosition({ top: 310, bottom: 330, left: 20 }, 200, 500, { top: 100, left: 0, width: 375, height: 260 });
  expect(placed).toEqual({ top: 108, left: 20, maxHeight: 198 });
});

test('short menus stay below the caret and clamp their horizontal position', () => {
  expect(menuPosition({ top: 100, bottom: 120, left: -20 }, 200, 44, { top: 0, left: 0, width: 320, height: 667 }))
    .toEqual({ top: 124, left: 8, maxHeight: 240 });
});

test.each([-100, 900])('scrolling the caret outside the visual viewport still bounds the menu (%s)', top => {
  const placed = menuPosition({ top, bottom: top + 20, left: 20 }, 200, 600, { top: 100, left: 0, width: 375, height: 200 });
  expect(placed.top).toBeGreaterThanOrEqual(108);
  expect(placed.top + placed.maxHeight).toBeLessThanOrEqual(292);
});
