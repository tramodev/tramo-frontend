import { expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const jsx = (type, props) => ({ type, props });
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];

function load(file, modules = {}) {
  const exports = {};
  let state = false;
  const refs = [];
  let refIndex = 0;
  runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    setTimeout,
    clearTimeout,
    require: name => ({
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'next/link': { default: 'Link' },
      react: {
        useState: () => {
          refIndex = 0;
          return [state, next => { state = next; }];
        },
        useRef: initial => refs[refIndex++] ??= { current: initial },
        useEffect: () => {},
      },
      ...modules,
    })[name] ?? {},
  });
  return exports;
}

test('desktop and mobile provide the same resource destinations', () => {
  const resources = load('components/layout/resources-menu.tsx');
  const mobile = load('components/layout/nav-mobile-menu.tsx', {
    '@/components/layout/resources-menu': resources,
    '@/components/layout/landing-section-link': { LandingSectionLink: 'Link' },
  });
  const expected = ['/wiki', '/changelog', '/roadmap', '/blog'];
  const desktop = flatten(resources.ResourcesMenu());
  expect(desktop.filter(node => node.type === 'Link').map(node => node.props.href)).toEqual(expected);
  expect(resources.ResourcesMenu().props.modal).toBe(false);
  const mobileNodes = flatten(mobile.NavMobileMenu({ isLoggedIn: false }));
  const destinations = mobileNodes.filter(node => node.type === 'Link').map(node => node.props.href);
  expect(destinations).toEqual(['/#product', '/#pricing', ...expected, '/login', '/signup']);
  expect(flatten(mobile.NavMobileMenu({ isLoggedIn: true })).some(node => node.props.href === '/login' || node.props.href === '/signup')).toBe(false);
});

test('hover opens resources, allows crossing into the menu and closes after leaving', () => {
  jest.useFakeTimers();
  try {
    const resources = load('components/layout/resources-menu.tsx');
    const trigger = flatten(resources.ResourcesMenu()).find(node => node.type === 'button');
    expect(resources.ResourcesMenu().props.open).toBe(false);
    trigger.props.onMouseEnter();
    expect(resources.ResourcesMenu().props.open).toBe(true);
    trigger.props.onMouseLeave();
    jest.advanceTimersByTime(100);
    const content = flatten(resources.ResourcesMenu()).find(node => node.props.align === 'start');
    content.props.onMouseEnter();
    jest.advanceTimersByTime(200);
    expect(resources.ResourcesMenu().props.open).toBe(true);
    content.props.onMouseLeave();
    jest.advanceTimersByTime(150);
    expect(resources.ResourcesMenu().props.open).toBe(false);
    const hoverClose = { preventDefault: jest.fn() };
    content.props.onCloseAutoFocus(hoverClose);
    expect(hoverClose.preventDefault).toHaveBeenCalledTimes(1);
    resources.ResourcesMenu().props.onOpenChange(true);
    expect(resources.ResourcesMenu().props.open).toBe(true);
    resources.ResourcesMenu().props.onOpenChange(false);
    expect(resources.ResourcesMenu().props.open).toBe(false);
    const keyboardClose = { preventDefault: jest.fn() };
    content.props.onCloseAutoFocus(keyboardClose);
    expect(keyboardClose.preventDefault).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});
