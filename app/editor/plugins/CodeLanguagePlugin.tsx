// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey, $getSelection, $isRangeSelection } from 'lexical';
import {
  $isCodeNode,
  CODE_LANGUAGE_MAP,
  getCodeLanguageOptions,
  getLanguageFriendlyName,
} from '@lexical/code';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const LANGUAGE_OPTIONS = getCodeLanguageOptions();

export default function CodeLanguagePlugin() {
  const [editor] = useLexicalComposerContext();
  const [active, setActive] = useState<{ nodeKey: string; language: string } | null>(null);
  const [, reposition] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        const block = $isRangeSelection(selection)
          ? selection.anchor.getNode().getTopLevelElement()
          : null;
        if (!$isCodeNode(block)) {
          setActive(null);
          return;
        }
        const language = block.getLanguage() ?? '';
        setActive({
          nodeKey: block.getKey(),
          language: CODE_LANGUAGE_MAP[language] || language || 'plain',
        });
      });
    });
  }, [editor]);

  const element = active === null ? null : editor.getElementByKey(active.nodeKey);

  useEffect(() => {
    if (element === null) return;
    element.classList.add('has-language-picker');
    window.addEventListener('resize', reposition);
    return () => {
      element.classList.remove('has-language-picker');
      window.removeEventListener('resize', reposition);
    };
  }, [element]);

  if (active === null || element === null || !editor.isEditable()) return null;

  const anchor = element.closest<HTMLElement>('.editor-content-column');
  if (anchor === null) return null;

  const anchorRect = anchor.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const rect = {
    top: elementRect.top - anchorRect.top,
    right: anchorRect.right - elementRect.right,
  };

  const applyLanguage = (next: string) => {
    editor.update(() => {
      const node = $getNodeByKey(active.nodeKey);
      if ($isCodeNode(node)) node.setLanguage(next);
    });
  };

  return createPortal(
    <DropdownMenu>
      <DropdownMenuTrigger
        className="code-language-picker"
        style={{ top: rect.top, right: rect.right }}
        aria-label="Code language"
      >
        {getLanguageFriendlyName(active.language)}
        <ChevronDown size={11} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
        {LANGUAGE_OPTIONS.map(([value, label]) => (
          <DropdownMenuItem key={value} onSelect={() => applyLanguage(value)}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>,
    anchor,
  );
}
