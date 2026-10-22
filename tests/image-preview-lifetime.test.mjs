import { expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup(selection = null) {
  const revoked = [], cleanups = [], uploads = [], nodes = new Map();
  let editor;
  const source = ts.transpileModule(readFileSync('app/editor/plugins/ImagesPlugin.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(source, {
    exports, URL: { createObjectURL: () => 'blob:preview', revokeObjectURL: url => revoked.push(url) },
    require: name => ({
      react: { useEffect: effect => cleanups.push(effect()) },
      '@lexical/react/LexicalComposerContext': { useLexicalComposerContext: () => [editor] },
      '@lexical/utils': { mergeRegister: (...callbacks) => () => callbacks.reverse().forEach(callback => callback()) },
      lexical: { $getSelection: () => selection && { clone: () => selection }, $isRangeSelection: value => !!value,
        $isElementNode: () => false, $setSelection: () => {}, createCommand: () => ({}), $insertNodes: () => {}, $getNodeByKey: key => nodes.get(key) },
      '../nodes/ImageNode': {
        ImageNode: class {},
        $isImageNode: node => Boolean(node),
        $createImageNode: () => {
          const node = { getKey: () => 'image', getTopLevelElement: () => null, setImageId: id => { node.imageId = id; } };
          nodes.set('image', node); return node;
        },
      },
      '@/lib/image-resize': { resizeImageToBlob: async () => ({}) },
      '@/lib/upload-image': { uploadEditorImage: async (_blob, projectId) => { uploads.push(projectId); return 'saved-image'; } },
      './codeBlockGuard': { $isSelectionInCode: () => false },
    })[name] ?? {},
  });
  const mount = previewUrls => {
    editor = { hasNodes: () => true, registerCommand: () => () => {}, getEditorState: () => ({ read: fn => fn() }), update: fn => fn() };
    exports.default({ projectId: 'project', previewUrls });
    return editor;
  };
  return { exports, mount, revoked, cleanups, nodes, uploads };
}

test('virtual unmount keeps previews owned by the note session', async () => {
  const s = setup(), previewUrls = new Set();
  const editor = s.mount(previewUrls);
  await s.exports.insertImageWithUpload(editor, { name: 'image' }, 'project');
  expect(previewUrls.has('blob:preview')).toBe(true);
  expect(s.nodes.get('image').imageId).toBe('saved-image');
  s.cleanups.shift()();
  expect(s.revoked).toEqual([]);
  s.mount(previewUrls); s.cleanups.shift()();
  expect(s.revoked).toEqual([]);
});

test('editors without a session still revoke their previews on unmount', async () => {
  const s = setup();
  await s.exports.insertImageWithUpload(s.mount(), { name: 'image' }, 'project');
  s.cleanups.shift()();
  expect(s.revoked).toEqual(['blob:preview']);
});

test('an image waits for the real project ID and clamps a selection changed during commit', async () => {
  const point = () => ({ key: 'text', type: 'text', offset: 8, set(key, offset, type) { this.key = key; this.offset = offset; this.type = type; } });
  const selection = { anchor: point(), focus: point() };
  const s = setup(selection);
  const editor = s.mount();
  s.nodes.set('text', { getTextContentSize: () => 1 });
  let confirm;
  const pending = s.exports.insertImageWithUpload(editor, { name: 'image' }, 'temporary', () => new Promise(resolve => { confirm = resolve; }));
  expect(s.nodes.has('image')).toBe(false);
  expect(s.uploads).toHaveLength(0);
  confirm('real-project'); await pending;
  expect(s.uploads).toEqual(['real-project']);
  expect(selection.anchor.offset).toBe(1);
  expect(selection.focus.offset).toBe(1);
  s.cleanups.shift()();
});
