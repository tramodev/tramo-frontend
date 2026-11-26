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
import { INSERT_GRAPH_COMMAND } from '@/app/editor/commands';
import { $createGraphNode, GraphNode } from '../nodes/GraphNode';
import { $isSelectionInCode } from './codeBlockGuard';
import { $insertDecoratorNode, markDecoratorForEditing } from '@/app/editor/plugins/decoratorCaret';

export default function GraphPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([GraphNode])) {
      throw new Error('GraphPlugin: GraphNode not registered on editor');
    }

    return editor.registerCommand<void>(
      INSERT_GRAPH_COMMAND,
      () => {
        if ($isSelectionInCode()) return true;
        const node = $createGraphNode({ equation: '' });
        $insertDecoratorNode(node);
        markDecoratorForEditing(editor, node.getKey());

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
