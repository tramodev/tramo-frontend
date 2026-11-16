// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isNodeSelection,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { INSERT_EQUATION_COMMAND, type InsertEquationPayload } from '@/app/editor/commands';
import { $createEquationNode, $isEquationNode, EquationNode } from '../nodes/EquationNode';
import { $isSelectionInCode } from './codeBlockGuard';
import { $insertDecoratorNode, markDecoratorForEditing } from '@/app/editor/plugins/decoratorCaret';

export default function EquationsPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([EquationNode])) {
      throw new Error('EquationsPlugin: EquationNode not registered on editor');
    }

    return mergeRegister(editor.registerCommand<InsertEquationPayload>(
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
    ), editor.registerCommand(
      FORMAT_ELEMENT_COMMAND,
      format => {
        const selection = $getSelection();
        if (!$isNodeSelection(selection)) return false;
        const blocks = selection.getNodes().filter($isEquationNode).filter(node => !node.isInline());
        blocks.forEach(node => node.setFormat(format === 'left' || format === 'center' || format === 'right' ? format : ''));
        return blocks.length > 0;
      },
      COMMAND_PRIORITY_LOW,
    ));
  }, [editor]);

  return null;
}
