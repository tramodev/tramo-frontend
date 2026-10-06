// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import * as React from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';
import { $isMusicNode } from '../nodes/MusicNode';
import { $caretOnEdgeLine, $caretTouches, type Edge } from './decoratorCaret';
import { DEFAULT_ABC, freshlyInsertedMusic } from './MusicPlugin';

interface MusicComponentProps {
  abc: string;
  nodeKey: NodeKey;
}

let abcjsModule: Promise<typeof import('abcjs')> | null = null;

function loadAbcjs() {
  abcjsModule ??= import('abcjs');
  return abcjsModule;
}

const RENDER_PARAMS = {
  ariaLabel: '',
  foregroundColor: 'currentColor',
  selectTypes: false,
  paddingtop: 0,
  paddingbottom: 0,
  paddingleft: 0,
  paddingright: 0,
} as const;

function naturalWidth(abcjs: typeof import('abcjs'), abc: string): number {
  const widths = abcjs
    .tuneMetrics(abc, RENDER_PARAMS)
    .flatMap((tune) => tune.sections.map((section) => section.left + section.total));
  return widths.length === 0 ? 0 : Math.ceil(Math.max(...widths));
}

function fitToDrawing(svg: SVGSVGElement) {
  const drawn = svg.getBBox();
  if (drawn.width === 0) return;
  const height = svg.getAttribute('height') ?? String(drawn.height);
  svg.setAttribute('viewBox', `${drawn.x} 0 ${drawn.width} ${height}`);
  svg.setAttribute('width', String(Math.ceil(drawn.width)));
}

function renderScore(
  abcjs: typeof import('abcjs'),
  target: HTMLElement,
  abc: string,
): string[] {
  const staffwidth = naturalWidth(abcjs, abc);
  const [tune] = abcjs.renderAbc(
    target,
    abc,
    staffwidth > 0 ? { ...RENDER_PARAMS, staffwidth } : RENDER_PARAMS,
  );
  target.querySelectorAll('style').forEach((node) => node.remove());
  const svg = target.querySelector('svg');
  if (svg !== null) fitToDrawing(svg);
  return tune?.warnings ?? [];
}

function $placeCaret(node: LexicalNode, edge: Edge) {
  const block = node.getTopLevelElement() ?? node;
  let neighbour = edge === 'after' ? block.getNextSibling() : block.getPreviousSibling();
  if (neighbour === null) {
    neighbour = $createParagraphNode();
    if (edge === 'after') block.insertAfter(neighbour);
    else block.insertBefore(neighbour);
  }
  if (!$isElementNode(neighbour)) return;
  if (edge === 'after') neighbour.selectStart();
  else neighbour.selectEnd();
}

function returnFocusTo(editor: LexicalEditor, nodeKey: NodeKey, edge: Edge) {
  editor.getRootElement()?.focus({ preventScroll: true });
  editor.update(() => {
    const node = $getNodeByKey(nodeKey);
    if (node !== null) $placeCaret(node, edge);
  });
}

export default function MusicComponent({ abc, nodeKey }: MusicComponentProps) {
  const [editor] = useLexicalComposerContext();
  const isEditable = editor.isEditable();
  const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);
  const [isEditing, setIsEditing] = useState(() => freshlyInsertedMusic.delete(nodeKey));
  const [draft, setDraft] = useState(() => (abc === '' ? DEFAULT_ABC : abc));
  const [warnings, setWarnings] = useState<string[]>([]);
  const scoreRef = useRef<HTMLDivElement | null>(null);
  const scoreBoxRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const entryEdgeRef = useRef<Edge | null>(null);
  const exitEdgeRef = useRef<Edge | null>(null);

  const discardedOnMount = useRef(false);
  useEffect(() => {
    if (discardedOnMount.current) return;
    discardedOnMount.current = true;
    if (!isEditable || isEditing || abc !== '') return;
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isMusicNode(node)) node.remove();
    });
  }, [abc, editor, isEditable, isEditing, nodeKey]);

  useEffect(() => {
    const target = scoreRef.current;
    if (isEditing || target === null || abc === '') return;
    let cancelled = false;
    loadAbcjs().then((abcjs) => {
      if (!cancelled) renderScore(abcjs, target, abc);
    });
    return () => {
      cancelled = true;
    };
  }, [abc, isEditing]);

  useEffect(() => {
    const target = previewRef.current;
    if (!isEditing || target === null) return;
    let cancelled = false;
    loadAbcjs().then((abcjs) => {
      if (!cancelled) setWarnings(renderScore(abcjs, target, draft));
    });
    return () => {
      cancelled = true;
    };
  }, [draft, isEditing]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!isEditing || textarea === null) return;
    textarea.focus();
    const at = entryEdgeRef.current === 'before' ? 0 : textarea.value.length;
    entryEdgeRef.current = null;
    textarea.setSelectionRange(at, at);
  }, [isEditing]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!isEditing || textarea === null) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft, isEditing]);

  useLayoutEffect(() => {
    if (isEditing || exitEdgeRef.current === null) return;
    const edge = exitEdgeRef.current;
    exitEdgeRef.current = null;
    returnFocusTo(editor, nodeKey, edge);
  }, [editor, isEditing, nodeKey]);

  const commit = useCallback(
    (exitTo: Edge | null = 'after') => {
      const next = draft.trim();
      if (next === '' || next === DEFAULT_ABC.trim()) {
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isMusicNode(node)) node.remove();
        });
        setIsEditing(false);
        return;
      }
      if (next !== abc) {
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isMusicNode(node)) node.setAbc(next);
        });
      }
      exitEdgeRef.current = exitTo;
      setIsEditing(false);
    },
    [abc, draft, editor, nodeKey],
  );

  const cancel = useCallback(() => {
    if (abc === '') {
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isMusicNode(node)) node.remove();
      });
      setIsEditing(false);
      return;
    }
    setDraft(abc);
    exitEdgeRef.current = 'after';
    setIsEditing(false);
  }, [abc, editor, nodeKey]);

  const startEditing = useCallback(
    (from: Edge | null = null) => {
      if (!isEditable) return;
      entryEdgeRef.current = from;
      setDraft(abc === '' ? DEFAULT_ABC : abc);
      setIsEditing(true);
    },
    [abc, isEditable],
  );

  const onDelete = useCallback(
    (event: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);
        if ($isMusicNode(node)) {
          node.remove();
        }
      }
      return false;
    },
    [isSelected, nodeKey],
  );

  const enterFrom = useCallback(
    (edge: Edge) => (event: KeyboardEvent) => {
      const node = $getNodeByKey(nodeKey);
      if (!$isMusicNode(node) || !$caretTouches(node, edge)) return false;
      event.preventDefault();
      startEditing(edge);
      return true;
    },
    [nodeKey, startEditing],
  );

  const enterFromLine = useCallback(
    (edge: Edge) => (event: KeyboardEvent) => {
      const node = $getNodeByKey(nodeKey);
      if (!$isMusicNode(node) || !$caretOnEdgeLine(node, edge, editor)) return false;
      event.preventDefault();
      startEditing(edge);
      return true;
    },
    [editor, nodeKey, startEditing],
  );

  useEffect(() => {
    if (!isEditable || isEditing) return;
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          if (scoreBoxRef.current === null || !scoreBoxRef.current.contains(event.target as Node)) {
            return false;
          }
          if (event.detail >= 2) {
            startEditing();
            return true;
          }
          clearSelected();
          setSelected(true);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ARROW_LEFT_COMMAND, enterFrom('after'), COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ARROW_RIGHT_COMMAND, enterFrom('before'), COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ARROW_UP_COMMAND, enterFromLine('after'), COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ARROW_DOWN_COMMAND, enterFromLine('before'), COMMAND_PRIORITY_LOW),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!isSelected || !$isNodeSelection($getSelection())) return false;
          event?.preventDefault();
          startEditing();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [clearSelected, editor, enterFrom, enterFromLine, isEditable, isEditing, isSelected, onDelete, setSelected, startEditing]);

  if (isEditing && isEditable) {
    return (
      <div key="editing" className="editor-music-editor">
        <textarea
          ref={textareaRef}
          className="editor-music-input"
          value={draft}
          rows={1}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit()}
          onKeyDown={(event) => {
            event.stopPropagation();
            const { selectionStart: from, selectionEnd: to, value } = event.currentTarget;
            const collapsed = from === to;
            const onFirstLine = value.lastIndexOf('\n', from - 1) === -1;
            const onLastLine = value.indexOf('\n', to) === -1;
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              commit();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              cancel();
            } else if (event.key === 'ArrowLeft' && collapsed && from === 0) {
              event.preventDefault();
              commit('before');
            } else if (event.key === 'ArrowRight' && collapsed && to === value.length) {
              event.preventDefault();
              commit('after');
            } else if (event.key === 'ArrowUp' && collapsed && onFirstLine) {
              event.preventDefault();
              commit('before');
            } else if (event.key === 'ArrowDown' && collapsed && onLastLine) {
              event.preventDefault();
              commit('after');
            }
          }}
          placeholder={DEFAULT_ABC}
          aria-label="ABC notation"
        />
        <div className="editor-music-preview" aria-hidden>
          <div ref={previewRef} />
        </div>
        {warnings.length > 0 && (
          <div className="editor-music-error">{warnings.join('\n')}</div>
        )}
      </div>
    );
  }

  return (
    <div
      key="rendered"
      ref={scoreBoxRef}
      role="img"
      aria-label="Music score"
      className={isSelected ? 'editor-music-rendered selected' : 'editor-music-rendered'}
      onDoubleClick={() => startEditing()}
    >
      <div ref={scoreRef} />
    </div>
  );
}
