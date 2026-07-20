"use client"

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $insertNodes,
  $isElementNode,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  createCommand,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  LexicalCommand,
  NodeKey,
  PASTE_COMMAND,
} from 'lexical';
import { $createImageNode, $isImageNode, ImageNode, ImagePayload } from '../nodes/ImageNode';
import { resizeImageToBlob } from '@/lib/image-resize';
import { uploadImage } from '@/lib/upload-image';

export type InsertImagePayload = Readonly<ImagePayload>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
  createCommand('INSERT_IMAGE_COMMAND');

export const EDITOR_IMAGE_MAX_DIMENSION = 1600;
export const EDITOR_IMAGE_QUALITY = 0.85;

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

// Inserts a local preview immediately (optimistic UI), then swaps it for the
// real R2 URL once the background upload finishes - or removes it on failure.
export function insertImageWithUpload(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  file: File,
): void {
  const previewUrl = URL.createObjectURL(file);
  let key: NodeKey | null = null;

  editor.update(() => {
    const imageNode = $createImageNode({ altText: file.name, src: previewUrl });
    $insertNodes([imageNode]);
    key = imageNode.getKey();
    $placeCaretBelowImage(imageNode);
  });

  (async () => {
    try {
      const blob = await resizeImageToBlob(file, EDITOR_IMAGE_MAX_DIMENSION, EDITOR_IMAGE_QUALITY);
      const src = await uploadImage(blob, 'editor-image');
      editor.update(() => {
        if (key === null) return;
        const node = $getNodeByKey(key);
        if ($isImageNode(node)) {
          node.setSrc(src);
        }
      });
      URL.revokeObjectURL(previewUrl);
    } catch (err) {
      console.error('Failed to upload image', err);
      editor.update(() => {
        if (key === null) return;
        $getNodeByKey(key)?.remove();
      });
      URL.revokeObjectURL(previewUrl);
    }
  })();
}

function insertImageFiles(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  files: File[],
): void {
  for (const file of files) {
    insertImageWithUpload(editor, file);
  }
}

export default function ImagesPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error('ImagesPlugin: ImageNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand<InsertImagePayload>(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          const imageNode = $createImageNode(payload);
          $insertNodes([imageNode]);
          $placeCaretBelowImage(imageNode);
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          if (event.target !== editor.getRootElement()) return false;
          const last = $getRoot().getLastChild();
          if ($isElementNode(last) && $isImageNode(last.getLastChild())) {
            const paragraph = $createParagraphNode();
            last.insertAfter(paragraph);
            paragraph.select();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const clipboardData = (event as ClipboardEvent).clipboardData;
          if (!clipboardData) return false;
          const files = getImageFiles(clipboardData);
          if (files.length === 0) return false;
          event.preventDefault();
          insertImageFiles(editor, files);
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
          insertImageFiles(editor, files);
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
  }, [editor]);

  return null;
}
