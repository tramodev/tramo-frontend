// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
} from 'lexical';
import { $createMusicNode, MusicNode } from '../nodes/MusicNode';
import { $isSelectionInCode } from './codeBlockGuard';

export const INSERT_MUSIC_COMMAND: LexicalCommand<void> = createCommand('INSERT_MUSIC_COMMAND');

export const freshlyInsertedMusic = new Set<string>();

export const DEFAULT_ABC = 'X:1\nT:\nM:4/4\nL:1/8\nK:C\n';

export default function MusicPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([MusicNode])) {
      throw new Error('MusicPlugin: MusicNode not registered on editor');
    }

    return editor.registerCommand<void>(
      INSERT_MUSIC_COMMAND,
      () => {
        if ($isSelectionInCode()) return true;
        const node = $createMusicNode({ abc: '' });
        freshlyInsertedMusic.add(node.getKey());
        $insertNodes([node]);

        const parent = node.getParentOrThrow();
        if ($isRootOrShadowRoot(parent) && node.getNextSibling() === null) {
          node.insertAfter($createParagraphNode());
        }
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.removeText();
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
