import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
const jsx = (type, props) => ({ type, props });
runInNewContext(ts.transpileModule(readFileSync('components/project/project-thumbnail.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require: name => ({
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/image': { default: 'Image' },
  '@/components/shared/author-avatar': { initial: title => title[0] },
})[name] ?? {} });

test('thumbnails show the saved snapshot image or a title placeholder', () => {
  const image = exports.ProjectThumbnail({ thumbnailImageUrl: '/image.png', title: 'Project' });
  expect(image.props.children.type).toBe('Image');
  const placeholder = exports.ProjectThumbnail({ thumbnailImageUrl: null, title: 'Project' });
  expect(placeholder.props.children.type).toBe('span');
});
