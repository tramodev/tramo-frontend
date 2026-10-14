import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

function meter(imageBytes, textBytes, quotaBytes) {
  const exports = {};
  const formats = {};
  const jsx = (type, props) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('lib/format-bytes.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: formats });
  runInNewContext(ts.transpileModule(readFileSync('components/profile/plan-panel.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: name => ({
      react: { useState: value => [value, () => {}], useTransition: () => [false, () => {}] },
      'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
      '@/lib/format-bytes': formats,
    })[name] ?? {},
  });
  const panel = exports.PlanPanel({ initialStatus: {
    supporter: false, storageUsedBytes: imageBytes + textBytes,
    storageImageBytes: imageBytes, storageTextBytes: textBytes,
    storageQuotaBytes: quotaBytes, publishesPerWeek: -1,
  } });
  const component = flatten(panel).find(node => node.type?.name === 'StorageMeter');
  return flatten(component.type(component.props));
}

test('storage shows proportional image and text segments with matching legends', () => {
  const mb = 1024 * 1024;
  const nodes = meter(40 * mb, 20 * mb, 100 * mb);
  const bar = nodes.find(node => node.props.role === 'progressbar');
  expect(bar.props['aria-valuenow']).toBe(60);
  expect(bar.props['aria-valuetext']).toBe('60.0MB / 100.0MB. Images: 40.0MB. Text: 20.0MB.');
  expect(bar.props.children.map(node => node.props.style.width)).toEqual(['40%', '20%']);
  expect(bar.props.children[0].props.className).toContain('bg-chart-1');
  expect(bar.props.children[1].props.className).toContain('bg-chart-2');
  expect(nodes.filter(node => node.props.className?.includes('inline-flex')).map(node => node.props.children[1]))
    .toEqual(['Images ', 'Text ']);
});

test('over-quota storage fills the bar without changing the image/text proportions', () => {
  const nodes = meter(150, 50, 100);
  const bar = nodes.find(node => node.props.role === 'progressbar');
  expect(bar.props['aria-valuenow']).toBe(100);
  expect(bar.props.children.map(node => node.props.style.width)).toEqual(['75%', '25%']);
});

test('sub-megabyte storage remains visible in both categories and the total', () => {
  const mb = 1024 * 1024;
  const bar = meter(0.4 * mb, 0.3 * mb, 500 * mb).find(node => node.props.role === 'progressbar');
  expect(bar.props['aria-valuetext']).toBe('0.7MB / 500.0MB. Images: 0.4MB. Text: 0.3MB.');
});

test.each([100, 0])('empty storage has zero-width segments even with quota %s', quota => {
  const bar = meter(0, 0, quota).find(node => node.props.role === 'progressbar');
  expect(bar.props['aria-valuenow']).toBe(0);
  expect(bar.props.children.map(node => node.props.style.width)).toEqual(['0%', '0%']);
});

test('project storage shows its own total and proportions without a plan quota', () => {
  const mb = 1024 * 1024;
  const bar = meter(3 * mb, mb).find(node => node.props.role === 'progressbar');
  expect(bar.props['aria-valuetext']).toBe('4.0MB. Images: 3.0MB. Text: 1.0MB.');
  expect(bar.props.children.map(node => node.props.style.width)).toEqual(['75%', '25%']);
  const empty = meter(0, 0).find(node => node.props.role === 'progressbar');
  expect(empty.props['aria-valuenow']).toBe(0);
  expect(empty.props.children.map(node => node.props.style.width)).toEqual(['0%', '0%']);
});
