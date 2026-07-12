"use client"

import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin"

import { ParagraphNode, TextNode } from "lexical"
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table"
import { ListItemNode, ListNode } from "@lexical/list"
import { CodeHighlightNode, CodeNode } from "@lexical/code"
import { AutoLinkNode, LinkNode } from "@lexical/link"

import ExampleTheme from "@/app/dashboard/ExampleTheme"
import { ImageNode } from "@/app/dashboard/nodes/ImageNode"
import "@/app/dashboard/Editor.css"

// Mirrors the editable editor's node set (app/dashboard/[projectId]/page.tsx)
// exactly — Lexical drops any node type not registered here when it parses
// stored editor-state JSON, so a mismatch would silently eat content.
const nodes = [
  ParagraphNode,
  TextNode,
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  AutoLinkNode,
  LinkNode,
  ImageNode,
]

export function LexicalReadOnly({ content }: { content: string }) {
  if (!content) return null

  return (
    <LexicalComposer
      initialConfig={{
        namespace: "public-view",
        nodes,
        theme: ExampleTheme,
        editable: false,
        editorState: content,
        onError(error: Error) {
          console.error(error)
        },
      }}
    >
      <RichTextPlugin
        contentEditable={<ContentEditable className="editor-input" />}
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <ClickableLinkPlugin newTab />
    </LexicalComposer>
  )
}
