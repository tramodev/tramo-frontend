// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ListNode } from '@lexical/list';
import { $getNodeByKey } from 'lexical';
import { $isMultilevelList } from '@/app/editor/list-style';

export default function ListStylePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerMutationListener(ListNode, (mutations) => {
      editor.getEditorState().read(() => {
        for (const [key, mutation] of mutations) {
          const element = editor.getElementByKey(key);
          if (mutation === 'destroyed' || element === null) continue;
          element.toggleAttribute('data-multilevel', $isMultilevelList($getNodeByKey(key)));
        }
      });
    });
  }, [editor]);

  return null;
}
