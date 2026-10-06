// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $getNodeByKey,
  $insertNodes,
  $isElementNode,
  COMMAND_PRIORITY_HIGH,
  createCommand,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  LexicalCommand,
  NodeKey,
  PASTE_COMMAND,
} from 'lexical';
import { $createImageNode, $isImageNode, ImageNode, ImagePayload } from '../nodes/ImageNode';
import { resizeImageToBlob } from '@/lib/image-resize';
import { uploadEditorImage } from '@/lib/upload-image';
import { $isSelectionInCode } from './codeBlockGuard';

export type InsertImagePayload = Readonly<ImagePayload>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
  createCommand('INSERT_IMAGE_COMMAND');

export const EDITOR_IMAGE_MAX_DIMENSION = 1600;
export const EDITOR_IMAGE_QUALITY = 0.85;

const previews = new WeakMap<ReturnType<typeof useLexicalComposerContext>[0], Set<string>>();

function $placeCaretBelowImage(imageNode: ImageNode): void {
  const block = imageNode.getTopLevelElement();
  if (block === null) return;
  let next = block.getNextSibling();
  if (next === null) {
    const paragraph = $createParagraphNode();
    block.insertAfter(paragraph);
    next = paragraph;
  }
  if ($isElementNode(next)) {
    next.selectStart();
  }
}

function getImageFiles(dataTransfer: DataTransfer): File[] {
  const files: File[] = [];
  for (const item of Array.from(dataTransfer.items || [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
}

export async function insertImageWithUpload(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  file: File,
  projectId?: string,
): Promise<void> {
  if (editor.getEditorState().read($isSelectionInCode) || !projectId) return;

  const previewUrl = URL.createObjectURL(file);
  const urls = previews.get(editor) ?? new Set<string>();
  previews.set(editor, urls);
  urls.add(previewUrl);
  let key: NodeKey | null = null;

  editor.update(() => {
    const imageNode = $createImageNode({ altText: file.name, src: previewUrl });
    $insertNodes([imageNode]);
    key = imageNode.getKey();
    $placeCaretBelowImage(imageNode);
  });

  try {
    const blob = await resizeImageToBlob(file, EDITOR_IMAGE_MAX_DIMENSION, EDITOR_IMAGE_QUALITY);
    const imageId = await uploadEditorImage(blob, projectId);
    editor.update(() => {
      if (key === null) return;
      const node = $getNodeByKey(key);
      if ($isImageNode(node)) {
        node.setImageId(imageId);
      }
    });
  } catch (err) {
    window.dispatchEvent(new CustomEvent('editor-image-error', { detail: err instanceof Error ? err.message : 'Image upload failed.' }));
    editor.update(() => {
      if (key === null) return;
      $getNodeByKey(key)?.remove();
    });
    URL.revokeObjectURL(previewUrl);
    urls.delete(previewUrl);
  }
}

const IMAGE_UPLOAD_CONCURRENCY = 3;

async function insertImageFiles(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  files: File[],
  projectId?: string,
): Promise<void> {
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < files.length) {
      const file = files[nextIndex++];
      await insertImageWithUpload(editor, file, projectId);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(IMAGE_UPLOAD_CONCURRENCY, files.length) }, worker)
  );
}

export default function ImagesPlugin({ projectId }: { projectId?: string }): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagesPlugin: ImageNode not registered on editor');
    }

    return mergeRegister(
      () => {
        previews.get(editor)?.forEach(url => URL.revokeObjectURL(url));
        previews.delete(editor);
      },
      editor.registerCommand<InsertImagePayload>(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          if ($isSelectionInCode()) return true;
          const imageNode = $createImageNode(payload);
          $insertNodes([imageNode]);
          $placeCaretBelowImage(imageNode);
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const clipboardData = (event as ClipboardEvent).clipboardData;
          if (!clipboardData) return false;
          const files = getImageFiles(clipboardData);
          if (files.length === 0) return false;
          event.preventDefault();
          insertImageFiles(editor, files, projectId);
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        DROP_COMMAND,
        (event) => {
          const dataTransfer = (event as DragEvent).dataTransfer;
          if (!dataTransfer) return false;
          const files = getImageFiles(dataTransfer);
          if (files.length === 0) return false;
          event.preventDefault();
          insertImageFiles(editor, files, projectId);
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        DRAGOVER_COMMAND,
        (event) => {
          const dataTransfer = (event as DragEvent).dataTransfer;
          if (dataTransfer?.types.includes('Files')) {
            event.preventDefault();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, projectId]);

  return null;
}
