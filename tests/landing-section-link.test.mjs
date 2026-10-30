import { expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup(reducedMotion = false, present = true) {
  const exports = {};
  const scrollIntoView = jest.fn();
  const getElementById = jest.fn(() => present ? { scrollIntoView } : null);
  runInNewContext(ts.transpileModule(readFileSync('components/layout/landing-section-link.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    document: { getElementById },
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    require: name => ({
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
      'next/link': { default: 'Link' },
    })[name] ?? {},
  });
  return { Link: exports.LandingSectionLink, scrollIntoView, getElementById };
}

test.each(['product', 'pricing'])('%s scrolls smoothly without navigating and preserves the mobile close handler', section => {
  const s = setup();
  const onClick = jest.fn();
  const link = s.Link({ href: `/#${section}`, onClick, children: section });
  const preventDefault = jest.fn();
  link.props.onNavigate({ preventDefault });
  expect(s.getElementById).toHaveBeenCalledWith(section);
  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(s.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  expect(link.props.onClick).toBe(onClick);
});

test('reduced motion skips the scroll animation', () => {
  const s = setup(true);
  s.Link({ href: '/#product' }).props.onNavigate({ preventDefault() {} });
  expect(s.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' });
});

test('the logo scrolls to the initial section without navigating', () => {
  const s = setup();
  const preventDefault = jest.fn();
  s.Link({ href: '/' }).props.onNavigate({ preventDefault });
  expect(s.getElementById).toHaveBeenCalledWith('home');
  expect(preventDefault).toHaveBeenCalledTimes(1);
  expect(s.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
});

test('links from other pages keep normal navigation to the landing', () => {
  const s = setup(false, false);
  const preventDefault = jest.fn();
  s.Link({ href: '/#pricing' }).props.onNavigate({ preventDefault });
  expect(preventDefault).not.toHaveBeenCalled();
  expect(s.scrollIntoView).not.toHaveBeenCalled();
});
