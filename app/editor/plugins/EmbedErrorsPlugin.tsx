"use client";

import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $isElementNode, type LexicalNode } from 'lexical';

export default function EmbedErrorsPlugin({ enabled, index, sequence }: { enabled: boolean; index?: number; sequence?: number }) {
  const [editor] = useLexicalComposerContext();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const request = `${sequence}:${index}`;
    if (!enabled || index === undefined || handled.current === request) return;
    const frame = requestAnimationFrame(() => {
      const key = editor.getEditorState().read(() => {
        const nodes: LexicalNode[] = [...$getRoot().getChildren()].reverse();
        let position = 0;
        while (nodes.length) {
          const node = nodes.pop()!;
          if ((node.getType() === 'equation' || node.getType() === 'music') && position++ === index) return node.getKey();
          if ($isElementNode(node)) nodes.push(...node.getChildren().reverse());
        }
        return null;
      });
      const element = key ? editor.getElementByKey(key)?.querySelector<HTMLElement>('[data-embed-key]') : null;
      element?.scrollIntoView({ block: 'center' });
      element?.focus({ preventScroll: true });
      if (element) handled.current = request;
    });
    return () => cancelAnimationFrame(frame);
  }, [editor, enabled, index, sequence]);
  return null;
}
