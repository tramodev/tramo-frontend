import { expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

function setup(uploadUrl = 'https://private-bucket/temporary/upload') {
  const exports = {}, events = [];
  const getUploadPresign = jest.fn(async () => { events.push('reserve'); return { uploadId: 'upload', uploadUrl }; });
  const completePublicUpload = jest.fn(async () => { events.push('confirm'); return 'https://cdn/avatar/1/validated.png'; });
  const fetch = jest.fn(async () => { events.push('put'); return new Response(null, { status: 200 }); });
  runInNewContext(ts.transpileModule(readFileSync('lib/upload-image.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, crypto: webcrypto, fetch,
    require: name => ({ './uploads': { getUploadPresign, completePublicUpload }, './editor-images': {} })[name],
  });
  return { uploadImage: exports.uploadImage, getUploadPresign, completePublicUpload, fetch, events };
}

test('public images are reserved, uploaded privately, and confirmed before returning their URL', async () => {
  const app = setup();
  const blob = new Blob(['abc'], { type: 'image/png' });
  expect(await app.uploadImage(blob, 'avatar')).toBe('https://cdn/avatar/1/validated.png');
  expect(app.events).toEqual(['reserve', 'put', 'confirm']);
  expect(app.getUploadPresign).toHaveBeenCalledWith('image/png', 'avatar',
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 3, undefined);
  expect(app.completePublicUpload).toHaveBeenCalledWith('upload');
});

test('a failed PUT never confirms an image or returns a public URL', async () => {
  const app = setup();
  app.fetch.mockResolvedValue(new Response(null, { status: 403 }));
  await expect(app.uploadImage(new Blob(['abc'], { type: 'image/png' }), 'thumbnail')).rejects.toThrow('Upload failed');
  expect(app.completePublicUpload).not.toHaveBeenCalled();
});

test('a validation failure is reported instead of accepting the claimed public URL', async () => {
  const app = setup();
  app.completePublicUpload.mockRejectedValue(new Error('Hash mismatch'));
  await expect(app.uploadImage(new Blob(['abc'], { type: 'image/png' }), 'avatar')).rejects.toThrow('Hash mismatch');
});

test('deduplicated confirmed images do not reopen an upload URL', async () => {
  const app = setup(null);
  expect(await app.uploadImage(new Blob(['abc'], { type: 'image/png' }), 'avatar')).toBe('https://cdn/avatar/1/validated.png');
  expect(app.fetch).not.toHaveBeenCalled();
  expect(app.events).toEqual(['reserve', 'confirm']);
});
