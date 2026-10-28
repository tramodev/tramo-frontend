// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { $getSelection, $isRangeSelection, $isParagraphNode, COMMAND_PRIORITY_CRITICAL, KEY_ENTER_COMMAND } from 'lexical';
import { $createCodeNode, getCodeLanguages } from '@lexical/code';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { $isSelectionInCode } from './codeBlockGuard';

export function CodeBlockGuardPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(
    () =>
      mergeRegister(
        editor.registerCommand(KEY_ENTER_COMMAND, event => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed() || event?.shiftKey || event?.isComposing || editor.isComposing()) return false;
          if (selection.anchor.offset !== selection.anchor.getNode().getTextContentSize()) return false;
          const block = selection.anchor.getNode().getTopLevelElement();
          if (!$isParagraphNode(block)) return false;
          const match = /^```([a-z0-9+-]*)$/.exec(block.getTextContent());
          if (!match || (match[1] && !getCodeLanguages().includes(match[1]))) return false;
          event?.preventDefault();
          const code = $createCodeNode(match[1] || 'plain');
          block.replace(code);
          code.selectStart();
          return true;
        }, COMMAND_PRIORITY_CRITICAL),
        editor.registerCommand(
          TOGGLE_LINK_COMMAND,
          () => $isSelectionInCode(),
          COMMAND_PRIORITY_CRITICAL,
        ),
        editor.registerCommand(
          INSERT_HORIZONTAL_RULE_COMMAND,
          () => $isSelectionInCode(),
          COMMAND_PRIORITY_CRITICAL,
        ),
      ),
    [editor],
  );

  return null;
}
