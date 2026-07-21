"use client"

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  NodeKey,
} from 'lexical';
import { $isImageNode } from '../nodes/ImageNode';

interface ImageComponentProps {
  src: string;
  altText: string;
  width: 'inherit' | number;
  height: 'inherit' | number;
  caption: string;
  nodeKey: NodeKey;
  resizable?: boolean;
}

export default function ImageComponent({
  src,
  altText,
  width,
  height,
  caption,
  nodeKey,
  resizable,
}: ImageComponentProps) {
  const [editor] = useLexicalComposerContext();
  const isEditable = editor.isEditable();
  const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [editingAlt, setEditingAlt] = useState(false);

  const commitCaption = useCallback(
    (value: string) => {
      if (value === caption) return;
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) node.setCaption(value);
      });
    },
    [editor, nodeKey, caption],
  );

  const commitAltText = useCallback(
    (value: string) => {
      if (value !== altText) {
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) node.setAltText(value);
        });
      }
      setEditingAlt(false);
    },
    [editor, nodeKey, altText],
  );

  useEffect(() => () => resizeCleanupRef.current?.(), []);

  const onDelete = useCallback(
    (event: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.remove();
        }
      }
      return false;
    },
    [isSelected, nodeKey],
  );

  useEffect(() => {
    if (!isEditable) return;
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          if (event.target === imageRef.current) {
            if (event.shiftKey) {
              setSelected(!isSelected);
            } else {
              clearSelected();
              setSelected(true);
            }
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
    );
  }, [clearSelected, editor, isEditable, isSelected, onDelete, setSelected]);

  useEffect(() => {
    if (!isEditable || !isSelected) return;
    const handlePointerDownOutside = (event: MouseEvent) => {
      const rootElement = editor.getRootElement();
      if (rootElement && !rootElement.contains(event.target as Node)) {
        clearSelected();
      }
    };
    document.addEventListener('mousedown', handlePointerDownOutside);
    return () => document.removeEventListener('mousedown', handlePointerDownOutside);
  }, [isEditable, isSelected, editor, clearSelected]);

  const handleResizeStart = (
    handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w',
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const image = imageRef.current;
    if (!image) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const rect = image.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    const aspectRatio = image.naturalWidth / image.naturalHeight || 1;
    const isCorner = handle.length === 2;
    const xSign = handle === 'nw' || handle === 'sw' || handle === 'w' ? -1 : 1;
    const ySign = handle === 'nw' || handle === 'ne' || handle === 'n' ? -1 : 1;

    const onPointerMove = (moveEvent: PointerEvent) => {
      let newWidth = startWidth;
      let newHeight = startHeight;

      if (isCorner) {
        const delta = (moveEvent.clientX - startX) * xSign;
        newWidth = Math.max(50, startWidth + delta);
        newHeight = newWidth / aspectRatio;
      } else if (handle === 'e' || handle === 'w') {
        const delta = (moveEvent.clientX - startX) * xSign;
        newWidth = Math.max(50, startWidth + delta);
      } else {
        const delta = (moveEvent.clientY - startY) * ySign;
        newHeight = Math.max(50, startHeight + delta);
      }

      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setWidthAndHeight(Math.round(newWidth), Math.round(newHeight));
        }
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      resizeCleanupRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    resizeCleanupRef.current = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  };

  return (
    <>
    <span
      className={`editor-image-wrapper${isSelected ? ' selected' : ''}`}
      draggable={false}
    >
      <img
        ref={imageRef}
        src={src}
        alt={altText}
        draggable={false}
        style={{
          width: width === 'inherit' ? undefined : `${width}px`,
          height: height === 'inherit' ? undefined : `${height}px`,
        }}
      />
      {isEditable && isSelected && (
        editingAlt ? (
          <input
            autoFocus
            defaultValue={altText}
            placeholder="Describe this image..."
            className="editor-image-alt-input"
            onMouseDown={(event) => event.stopPropagation()}
            onBlur={(event) => commitAltText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
              if (event.key === 'Escape') setEditingAlt(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="editor-image-alt-badge"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => setEditingAlt(true)}
          >
            Alt text
          </button>
        )
      )}
      {resizable && isEditable && isSelected && (
        <>
          <div
            className="editor-image-resizer editor-image-resizer-nw"
            onPointerDown={(event) => handleResizeStart('nw', event)}
          />
          <div
            className="editor-image-resizer editor-image-resizer-ne"
            onPointerDown={(event) => handleResizeStart('ne', event)}
          />
          <div
            className="editor-image-resizer editor-image-resizer-sw"
            onPointerDown={(event) => handleResizeStart('sw', event)}
          />
          <div
            className="editor-image-resizer editor-image-resizer-se"
            onPointerDown={(event) => handleResizeStart('se', event)}
          />
          <div
            className="editor-image-resizer editor-image-resizer-n"
            onPointerDown={(event) => handleResizeStart('n', event)}
          />
          <div
            className="editor-image-resizer editor-image-resizer-s"
            onPointerDown={(event) => handleResizeStart('s', event)}
          />
          <div
            className="editor-image-resizer editor-image-resizer-e"
            onPointerDown={(event) => handleResizeStart('e', event)}
          />
          <div
            className="editor-image-resizer editor-image-resizer-w"
            onPointerDown={(event) => handleResizeStart('w', event)}
          />
        </>
      )}
    </span>
    {isEditable ? (
      <input
        key={`${nodeKey}-${caption}`}
        defaultValue={caption}
        placeholder="Add a caption..."
        className="editor-image-caption editor-image-caption-input"
        onBlur={(event) => commitCaption(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
        }}
      />
    ) : (
      caption && <div className="editor-image-caption">{caption}</div>
    )}
    </>
  );
}
