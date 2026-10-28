// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateNodesFromSerializedNodes, $insertDataTransferForPlainText, $insertGeneratedNodes } from '@lexical/clipboard';
import { sanitizeNoteContent } from '@/app/editor/note-content';
import { $generateNodesFromDOM } from '@lexical/html';
import {
  $getSelection,
  $isRangeSelection,
  isDOMNode,
  isSelectionCapturedInDecoratorInput,
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
} from 'lexical';

const STRIPPED_STYLES = ['color', 'background-color', 'font-family', 'font-size'];

export default function PastePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = (event as ClipboardEvent).clipboardData;
        if (!clipboardData) return false;
        if (isDOMNode(event.target) && isSelectionCapturedInDecoratorInput(event.target)) return false;
        if (Array.from(clipboardData.items || []).some((item) => item.kind === 'file')) return false;
        if (clipboardData.types.includes('application/x-lexical-editor')) {
          const selection = $getSelection();
          if (!selection) { event.preventDefault(); return true; }
          let nodes;
          try {
            const payload = JSON.parse(clipboardData.getData('application/x-lexical-editor'));
            if (payload.namespace !== editor._config.namespace) return false;
            const sanitized = sanitizeNoteContent(JSON.stringify({ root: { type: 'root', children: payload.nodes } }));
            nodes = $generateNodesFromSerializedNodes(JSON.parse(sanitized).root.children);
          } catch (error) {
            console.error('Could not paste editor content; using plain text.', error);
            event.preventDefault();
            if (clipboardData.getData('text/plain') || clipboardData.getData('text/uri-list')) {
              $insertDataTransferForPlainText(clipboardData, selection);
            }
            return true;
          }
          event.preventDefault();
          $insertGeneratedNodes(editor, nodes, selection);
          return true;
        }
        const html = clipboardData.getData('text/html');
        // Match Lexical's plain-text fallback so HTML whitespace does not swallow paragraph breaks.
        if (!html || html === clipboardData.getData('text/plain')) return false;
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        event.preventDefault();
        const dom = new DOMParser().parseFromString(html, 'text/html');
        for (const element of Array.from(dom.body.querySelectorAll('[style]'))) {
          for (const prop of STRIPPED_STYLES) {
            (element as HTMLElement).style.removeProperty(prop);
          }
        }
        const nodes = $generateNodesFromDOM(editor, dom);
        $insertGeneratedNodes(editor, nodes, selection);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}
