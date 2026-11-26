import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const exports = {};
runInNewContext(ts.transpileModule(readFileSync('app/editor/graph-function.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, Error, Math, Number, require: name => name === 'katex' ? { default: require('katex') } : require(name) });
const { compileGraph } = exports;

const at = (source, x) => {
  const { fn, error } = compileGraph(source);
  expect(error).toBeNull();
  return fn(x);
};

test.each([
  ['x^2', 3, 9],
  ['f(x) = 2x + 1', 4, 9],
  ['y = \\frac{x}{2}', 5, 2.5],
  ['\\sqrt{x}', 9, 3],
  ['\\sqrt[3]{x}', -8, -2],
  ['\\sin^2 x + \\cos^2 x', 0.7, 1],
  ['\\sin(x)\\cos(x)', 1, Math.sin(1) * Math.cos(1)],
  ['\\log_2 x', 8, 3],
  ['\\ln x', Math.E, 1],
  ['e^{-x}', 0, 1],
  ['-x^2', 3, -9],
  ['12.5 \\cdot x', 2, 25],
  ['x/2*3', 4, 6],
  ['|x - 3|', 1, 2],
  ['\\left| x \\right|', -4, 4],
  ['2\\pi x', 1, 2 * Math.PI],
  ['\\dfrac{1}{x}', 4, 0.25],
  ['(x+1)(x-1)', 3, 8],
  ['1.5\\, x', 2, 3],
  ['f(x)= sin(x+2)', 1, Math.sin(3)],
  ['sin^2 x + cos^2 x', 0.3, 1],
  ['sinh x', 1, Math.sinh(1)],
  ['2 pi x', 1, 2 * Math.PI],
  ['pi^2', 0, Math.PI ** 2],
  ['ln(e x)', 1, 1],
  ['sqrt(x)', 4, 2],
  ['abs(x - 3)', 1, 2],
  ['y', 0, NaN],
])('%s at x=%d', (source, x, expected) => {
  if (Number.isNaN(expected)) expect(compileGraph(source).fn).toBeNull();
  else expect(at(source, x)).toBeCloseTo(expected, 10);
});

test.each(['y', 'x + y', '\\int x', 'x <', 'x_1', '', 'f(x) =', '(x', '\\frac{x'])('%s is rejected with a message', source => {
  const { fn, error } = compileGraph(source);
  expect(fn).toBeNull();
  expect(typeof error).toBe('string');
  expect(error.length).toBeGreaterThan(0);
});

test('katex parse tree keeps the shape the evaluator relies on', () => {
  const katex = require('katex');
  expect(katex.__parse('\\frac{\\sin x}{2}', {})[0]).toMatchObject({ type: 'genfrac', numer: { type: 'ordgroup', body: [{ type: 'op', name: '\\sin' }, { type: 'mathord', text: 'x' }] } });
});
