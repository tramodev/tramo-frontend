// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { SafeNoteComposer } from "@/components/editor/safe-note-composer"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin"

import { editorConfig } from "@/app/editor/lexical-config"
import ItemLinkClickPlugin from "@/app/editor/plugins/ItemLinkClickPlugin"
import CodeHighlightPlugin from "@/app/editor/plugins/CodeHighlightPlugin"
import "@/app/editor/Editor.css"

export function LexicalReadOnly({
  content,
  onItemClick,
}: {
  content: string
  onItemClick?: (itemId: string) => void
}) {
  if (!content) return null

  return (
    <SafeNoteComposer
      initialConfig={{
        ...editorConfig,
        namespace: "public-view",
        editable: false,
        editorState: content,
      }}
    >
      <RichTextPlugin
        contentEditable={<ContentEditable className="editor-input" aria-label="Note content" />}
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
      {onItemClick && <ItemLinkClickPlugin onNavigate={onItemClick} />}
      <CodeHighlightPlugin />
      <ClickableLinkPlugin newTab />
    </SafeNoteComposer>
  )
}
