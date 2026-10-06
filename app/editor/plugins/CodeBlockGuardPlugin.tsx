// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { COMMAND_PRIORITY_CRITICAL } from 'lexical';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { $isSelectionInCode } from './codeBlockGuard';

export function CodeBlockGuardPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(
    () =>
      mergeRegister(
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
