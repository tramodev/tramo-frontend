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
  HISTORIC_TAG,
  HISTORY_PUSH_TAG,
  HISTORY_MERGE_TAG,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';
import { $isMusicNode } from '@/app/editor/nodes/MusicNode';
import { $caretOnEdgeLine, $caretTouches, editingDecorators, type Edge } from '@/app/editor/plugins/decoratorCaret';
import MusicPlayback from '@/app/editor/plugins/MusicPlayback';
import { loadAbcjs } from '@/app/editor/plugins/music-audio';
import { DEFAULT_ABC } from '@/app/editor/plugins/MusicPlugin';

interface MusicComponentProps {
  abc: string;
  nodeKey: NodeKey;
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

function plainMusicWarning(warning: string): string {
  const ignored = /^(Music Line:\d+:\d+: Unknown character ignored:)\s+.*?<span\b[^>]*>(.*?)<\/span>/.exec(warning);
  if (ignored) warning = `${ignored[1]} ${ignored[2]}`;
  const entities: Record<string, string> = { '&lt;': '<', '&gt;': '>', '&amp;': '&' };
  return warning.replace(/<\/?span\b[^>]*>|&(?:lt|gt|amp);/g, token => entities[token] ?? '');
}

function renderScore(
  abcjs: typeof import('abcjs'),
  target: HTMLElement,
  abc: string,
): string[] {
  const staffwidth = Math.max(240, target.parentElement?.clientWidth ?? 600);
  const [tune] = abcjs.renderAbc(
    target,
    abc,
    { ...RENDER_PARAMS, staffwidth, responsive: 'resize', wrap: { minSpacing: 1.8, maxSpacing: 2.7, preferredMeasuresPerLine: 4 } },
  );
  target.querySelectorAll('style').forEach((node) => node.remove());
  target.querySelectorAll('svg').forEach((node) => node.setAttribute('aria-hidden', 'true'));
  return (tune?.warnings ?? []).map(plainMusicWarning);
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
  editor.focus();
}

export default function MusicComponent({ abc, nodeKey }: MusicComponentProps) {
  const [editor] = useLexicalComposerContext();
  const isEditable = editor.isEditable();
  const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);
  const [isEditing, setIsEditing] = useState(() => editingDecorators.get(editor)?.has(nodeKey) === true);
  const [draft, setDraft] = useState(() => (abc === '' ? DEFAULT_ABC : abc));
  const [warnings, setWarnings] = useState<string[]>([]);
  const scoreRef = useRef<HTMLDivElement | null>(null);
  const scoreBoxRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const entryEdgeRef = useRef<Edge | null>(null);
  const exitEdgeRef = useRef<Edge | null>(null);
  const firstChangeRef = useRef(true);
  const editingRef = useRef(isEditing);

  useLayoutEffect(() => {
    editingDecorators.get(editor)?.delete(nodeKey);
  }, [editor, nodeKey]);

  useEffect(() => {
    const target = scoreRef.current;
    if (isEditing || target === null || abc === '') return;
    let cancelled = false;
    const observer = new ResizeObserver(() => {
      void loadAbcjs().then(abcjs => { if (!cancelled) renderScore(abcjs, target, abc); });
    });
    if (target.parentElement) observer.observe(target.parentElement);
    void loadAbcjs().then(abcjs => { if (!cancelled) renderScore(abcjs, target, abc); });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [abc, isEditing]);

  useEffect(() => {
    const target = previewRef.current;
    if (!isEditing || target === null) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      loadAbcjs().then((abcjs) => {
        if (!cancelled) setWarnings(renderScore(abcjs, target, draft));
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
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

  useEffect(() => editor.registerUpdateListener(({ editorState, tags }) => {
    if (!tags.has(HISTORIC_TAG)) return;
    firstChangeRef.current = true;
    editingRef.current = false;
    exitEdgeRef.current = null;
    setIsEditing(false);
    editorState.read(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isMusicNode(node)) setDraft(node.getAbc());
    });
  }), [editor, nodeKey]);

  const updateDraft = useCallback((value: string) => {
    setDraft(value);
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isMusicNode(node)) node.setAbc(value);
    }, { tag: firstChangeRef.current ? HISTORY_PUSH_TAG : HISTORY_MERGE_TAG });
    firstChangeRef.current = false;
  }, [editor, nodeKey]);

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
      if (!editingRef.current) return;
      editingRef.current = false;
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (!$isMusicNode(node)) return;
        const next = node.getAbc().trim();
        if (next === '' || next === DEFAULT_ABC.trim()) {
          node.remove();
          return;
        }
        if (next !== node.getAbc()) node.setAbc(next);
        exitEdgeRef.current = exitTo;
      }, { discrete: true, tag: HISTORY_MERGE_TAG });
      setIsEditing(false);
    },
    [editor, nodeKey],
  );

  const startEditing = useCallback(
    (from: Edge | null = null) => {
      if (!isEditable) return;
      entryEdgeRef.current = from;
      firstChangeRef.current = true;
      editingRef.current = true;
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
          onChange={(event) => updateDraft(event.target.value)}
          onBlur={() => commit(null)}
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
              commit();
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
        <div className="text-xs text-muted-foreground">
          Ctrl/⌘+Enter to finish · Example: CDEF GABc | cBAG FEDC | ·{' '}
          <a className="underline" href="https://abcnotation.com/learn" target="_blank" rel="noopener noreferrer">ABC notation guide</a>
        </div>
        <MusicPlayback key={draft} abc={draft} />
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
      className={isSelected ? 'editor-music-rendered selected' : 'editor-music-rendered'}
      onDoubleClick={() => startEditing()}
    >
      <div ref={scoreRef} role="img" aria-label="Music score" />
      {isEditable && isSelected && <button type="button" className="inline-flex min-h-6 items-center rounded px-2 text-xs text-primary hover:bg-muted" onKeyDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); startEditing(); }}>Edit score</button>}
      <MusicPlayback key={abc} abc={abc} />
    </div>
  );
}
