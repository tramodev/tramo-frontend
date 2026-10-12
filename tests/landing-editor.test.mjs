import { expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('clicking empty editor space focuses the end without moving clicks inside text', () => {
  const content = { focus: jest.fn() };
  const range = { selectNodeContents: jest.fn(), collapse: jest.fn() };
  const selection = { removeAllRanges: jest.fn(), addRange: jest.fn() };
  const exports = {};
  const code = ts.transpileModule(readFileSync('components/landing/browser-mockup.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const jsx = (type, props) => ({ type, props });
  runInNewContext(code, {
    exports,
    require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx } : {},
    document: { createRange: () => range },
    window: { getSelection: () => selection },
  });
  const findClick = node => {
    if (!node?.props) return;
    if (node?.props?.onClick) return node.props.onClick;
    return [node?.props?.children].flat().map(findClick).find(Boolean);
  };
  const onClick = findClick(exports.BrowserMockup());
  const container = { querySelector: () => content };
  onClick({ target: content, currentTarget: container });
  expect(content.focus).not.toHaveBeenCalled();
  onClick({ target: container, currentTarget: container });
  expect(content.focus).toHaveBeenCalledTimes(1);
  expect(range.selectNodeContents).toHaveBeenCalledWith(content);
  expect(range.collapse).toHaveBeenCalledWith(false);
  expect(selection.removeAllRanges).toHaveBeenCalledTimes(1);
  expect(selection.addRange).toHaveBeenCalledWith(range);
});
