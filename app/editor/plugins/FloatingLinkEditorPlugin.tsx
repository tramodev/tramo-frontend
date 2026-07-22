"use client"

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isLinkNode, LinkNode } from '@lexical/link';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  createCommand,
  LexicalCommand,
} from 'lexical';
import { $findMatchingParent } from '@lexical/utils';
import { Check, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { itemIdFromRel } from './itemLink';

export const OPEN_LINK_EDITOR_COMMAND: LexicalCommand<void> = createCommand('OPEN_LINK_EDITOR_COMMAND');

export const PLACEHOLDER_URL = 'https://';

function isItemMentionLink(node: LinkNode): boolean {
  return itemIdFromRel(node.getRel() ?? '') !== null;
}

export default function FloatingLinkEditorPlugin() {
  const [editor] = useLexicalComposerContext();
  const [activeLinkKey, setActiveLinkKey] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [editing, setEditing] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [draftUrl, setDraftUrl] = useState('');
  const wantEditRef = useRef(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const closePopover = useCallback(() => {
    setActiveLinkKey(null);
    setEditing(false);
    setPosition(null);
  }, []);

  const cleanupPlaceholder = useCallback(
    (key: string) => {
      editor.update(() => {
        const node = $getNodeByKey(key);
        if ($isLinkNode(node) && node.getURL() === PLACEHOLDER_URL) {
          for (const child of node.getChildren()) {
            node.insertBefore(child);
          }
          node.remove();
        }
      });
    },
    [editor],
  );

  const dismiss = useCallback(() => {
    if (activeLinkKey) cleanupPlaceholder(activeLinkKey);
    closePopover();
  }, [activeLinkKey, cleanupPlaceholder, closePopover]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const node = selection.anchor.getNode();
        const linkNode = $findMatchingParent(node, $isLinkNode) as LinkNode | null;
        if (linkNode && !isItemMentionLink(linkNode)) {
          const nativeSelection = window.getSelection();
          if (nativeSelection && nativeSelection.rangeCount > 0) {
            const rect = nativeSelection.getRangeAt(0).getBoundingClientRect();
            setPosition({ top: rect.bottom + 6, left: rect.left });
          }
          setLinkUrl(linkNode.getURL());
          setActiveLinkKey((prev) => {
            if (prev !== linkNode.getKey()) setEditing(false);
            return linkNode.getKey();
          });
          if (wantEditRef.current) {
            wantEditRef.current = false;
            const url = linkNode.getURL();
            setDraftUrl(url === PLACEHOLDER_URL ? '' : url);
            setEditing(true);
          }
        } else {
          setActiveLinkKey((prev) => {
            if (prev !== null) {
              cleanupPlaceholder(prev);
              setEditing(false);
              setPosition(null);
            }
            return null;
          });
        }
      });
    });
  }, [editor, cleanupPlaceholder]);

  useEffect(() => {
    return editor.registerCommand(
      OPEN_LINK_EDITOR_COMMAND,
      () => {
        wantEditRef.current = true;
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  useEffect(() => {
    if (!activeLinkKey) return;
    const handleScroll = (event: Event) => {
      if (
        popoverRef.current &&
        event.target instanceof Node &&
        popoverRef.current.contains(event.target)
      ) {
        return;
      }
      dismiss();
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [activeLinkKey, dismiss]);

  const saveUrl = () => {
    if (!activeLinkKey) return;
    const url = draftUrl.trim();
    if (!url) return;
    const normalizedUrl = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    editor.update(() => {
      const node = $getNodeByKey(activeLinkKey);
      if ($isLinkNode(node)) {
        node.setURL(normalizedUrl);
      }
    });
    setLinkUrl(normalizedUrl);
    setEditing(false);
  };

  const removeLink = () => {
    if (!activeLinkKey) return;
    editor.update(() => {
      const node = $getNodeByKey(activeLinkKey);
      if ($isLinkNode(node)) {
        for (const child of node.getChildren()) {
          node.insertBefore(child);
        }
        node.remove();
      }
    });
    closePopover();
  };

  if (!activeLinkKey || !position) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className="floating-link-editor"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {editing ? (
        <>
          <input
            autoFocus
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveUrl();
              }
              if (e.key === 'Escape') dismiss();
            }}
            placeholder="Enter URL"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={saveUrl} aria-label="Save link">
                <Check size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Save</TooltipContent>
          </Tooltip>
        </>
      ) : (
        <>
          <a href={linkUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={13} />
            <span className="floating-link-editor-url">{linkUrl}</span>
          </a>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  setDraftUrl(linkUrl);
                  setEditing(true);
                }}
                aria-label="Edit link"
              >
                <Pencil size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Edit link</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={removeLink} aria-label="Remove link">
                <Trash2 size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Remove link</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>,
    document.body,
  );
}
