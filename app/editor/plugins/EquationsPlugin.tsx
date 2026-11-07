// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';
import { INSERT_EQUATION_COMMAND, type InsertEquationPayload } from '@/app/editor/commands';
import { $createEquationNode, EquationNode } from '../nodes/EquationNode';
import { $isSelectionInCode } from './codeBlockGuard';
import { $insertDecoratorNode, markDecoratorForEditing } from '@/app/editor/plugins/decoratorCaret';

export default function EquationsPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([EquationNode])) {
      throw new Error('EquationsPlugin: EquationNode not registered on editor');
    }

    return editor.registerCommand<InsertEquationPayload>(
      INSERT_EQUATION_COMMAND,
      ({ equation, inline }) => {
        if ($isSelectionInCode()) return true;
        const node = $createEquationNode({ equation, inline });
        $insertDecoratorNode(node);
        markDecoratorForEditing(editor, node.getKey());

        if (!inline) {
          const parent = node.getParentOrThrow();
          if ($isRootOrShadowRoot(parent) && node.getNextSibling() === null) {
            node.insertAfter($createParagraphNode());
          }
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.removeText();
          }
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}
