"use client"

import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin"

import { ParagraphNode, TextNode } from "lexical"
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { ListItemNode, ListNode } from "@lexical/list"
import { CodeHighlightNode, CodeNode } from "@lexical/code"
import { AutoLinkNode, LinkNode } from "@lexical/link"

import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode"
import ExampleTheme from "@/app/editor/ExampleTheme"
import { ImageNode } from "@/app/editor/nodes/ImageNode"
import ItemLinkClickPlugin from "@/app/editor/plugins/ItemLinkClickPlugin"
import "@/app/editor/Editor.css"

const nodes = [
  ParagraphNode,
  TextNode,
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
  ImageNode,
  HorizontalRuleNode,
]

export function LexicalReadOnly({
  content,
  onItemClick,
}: {
  content: string
  onItemClick?: (itemId: string) => void
}) {
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
      {onItemClick && <ItemLinkClickPlugin onNavigate={onItemClick} />}
      <ClickableLinkPlugin newTab />
    </LexicalComposer>
  )
}
