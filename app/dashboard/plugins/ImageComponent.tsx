/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
"use client"

import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
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
  nodeKey: NodeKey;
  resizable?: boolean;
}

export default function ImageComponent({
  src,
  altText,
  width,
  height,
  nodeKey,
  resizable,
}: ImageComponentProps) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);
  const imageRef = useRef<HTMLImageElement | null>(null);

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
  }, [clearSelected, editor, isSelected, onDelete, setSelected]);

  const handleResizeStart = (
    corner: 'nw' | 'ne' | 'sw' | 'se',
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const image = imageRef.current;
    if (!image) return;
    const startX = event.clientX;
    const startWidth = image.getBoundingClientRect().width;
    const aspectRatio = image.naturalWidth / image.naturalHeight || 1;
    // Left-side handles grow the image when dragged left, right-side handles grow it
    // when dragged right — both corners on a side move the same way horizontally
    // since only width/height are stored (the image isn't independently positioned).
    const sign = corner === 'nw' || corner === 'sw' ? -1 : 1;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = (moveEvent.clientX - startX) * sign;
      const newWidth = Math.max(50, startWidth + delta);
      const newHeight = newWidth / aspectRatio;
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
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
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
      {resizable && isSelected && (
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
        </>
      )}
    </span>
  );
}
