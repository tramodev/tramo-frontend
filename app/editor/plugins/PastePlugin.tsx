"use client"

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertGeneratedNodes } from '@lexical/clipboard';
import { $generateNodesFromDOM } from '@lexical/html';
import {
  $getSelection,
  $isRangeSelection,
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
        if (clipboardData.types.includes('application/x-lexical-editor')) return false;
        if (Array.from(clipboardData.items || []).some((item) => item.kind === 'file')) return false;
        const html = clipboardData.getData('text/html');
        if (!html) return false;
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
