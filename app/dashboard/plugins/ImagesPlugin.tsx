"use client"

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $insertNodes,
  COMMAND_PRIORITY_HIGH,
  createCommand,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  LexicalCommand,
  PASTE_COMMAND,
} from 'lexical';
import { $createImageNode, ImageNode, ImagePayload } from '../nodes/ImageNode';

export type InsertImagePayload = Readonly<ImagePayload>;

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
  createCommand('INSERT_IMAGE_COMMAND');

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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

async function insertImageFiles(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  files: File[],
): Promise<void> {
  for (const file of files) {
    const src = await readFileAsDataURL(file);
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, { altText: file.name, src });
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
