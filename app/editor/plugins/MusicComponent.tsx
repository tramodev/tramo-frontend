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
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';
import { $isMusicNode } from '@/app/editor/nodes/MusicNode';
import { $caretOnEdgeLine, $caretTouches, editingDecorators, type Edge } from '@/app/editor/plugins/decoratorCaret';
import MusicPlayback from '@/app/editor/plugins/MusicPlayback';
import { loadAbcjs } from '@/app/editor/plugins/music-audio';
import { DEFAULT_ABC } from '@/app/editor/plugins/MusicPlugin';
import { musicError, plainMusicWarning } from '@/app/editor/embed-validity';
import { useEmbedDraftExit } from '@/app/editor/plugins/useEmbedDraftExit';
import { setPendingEmbedDraft } from '@/app/editor/embed-draft-status';

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
  if (!$isElementNode(neighbour)) {
    neighbour = $createParagraphNode();
    if (edge === 'after') block.insertAfter(neighbour);
    else block.insertBefore(neighbour);
  }
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
  const lengthError = draft.length > 10000 ? 'Music scores must not exceed 10,000 characters. Shorten this score to save it.' : null;
  const [warnings, setWarnings] = useState<string[]>([]);
  const scoreRef = useRef<HTMLDivElement | null>(null);
  const scoreBoxRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const entryEdgeRef = useRef<Edge | null>(null);
  const exitEdgeRef = useRef<Edge | null>(null);
  const editingRef = useRef(isEditing);
  const pendingToken = useRef({});

  useEffect(() => {
    const token = pendingToken.current;
    setPendingEmbedDraft(token, isEditing && draft !== (abc === '' ? DEFAULT_ABC : abc));
    return () => setPendingEmbedDraft(token, false);
  }, [isEditing, draft, abc]);
  const [validation, setValidation] = useState<{ source: string; error: string | null; unavailable?: boolean } | null>(null);

  useLayoutEffect(() => {
    editingDecorators.get(editor)?.delete(nodeKey);
  }, [editor, nodeKey]);

  useEffect(() => {
    let cancelled = false;
    const source = isEditing ? draft : abc;
    const timer = setTimeout(() => {
      void musicError(source).then(error => {
        if (!cancelled) { setValidation({ source, error }); setWarnings(error ? [error] : []); }
      }).catch(() => {
        if (!cancelled) setValidation({ source, error: 'Could not load the score renderer. Try again.', unavailable: true });
      });
    }, isEditing ? 250 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [abc, draft, isEditing]);

  useEffect(() => {
    const source = isEditing ? draft : abc;
    const target = isEditing ? previewRef.current : scoreRef.current;
    if (!target || validation?.source !== source || validation.error) return;
    let cancelled = false;
    const render = () => {
      void loadAbcjs().then(abcjs => {
        if (!cancelled) {
          try { renderScore(abcjs, target, source); }
          catch { setValidation({ source, error: 'Could not render this score.' }); }
        }
      }).catch(() => {
        if (!cancelled) setValidation({ source, error: 'Could not load the score renderer. Try again.', unavailable: true });
      });
    };
    render();
    const observer = new ResizeObserver(render);
    if (target.parentElement) observer.observe(target.parentElement);
    return () => { cancelled = true; observer.disconnect(); };
  }, [abc, draft, isEditing, validation]);

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
    editingRef.current = false;
    exitEdgeRef.current = null;
    setIsEditing(false);
    editorState.read(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isMusicNode(node)) setDraft(node.getAbc());
    });
  }), [editor, nodeKey]);

  useEffect(() => {
    if (!isEditing || draft === abc || !draft.trim() || draft.trim() === DEFAULT_ABC.trim()) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft, abc, isEditing]);

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
    (exitTo: Edge | null = 'after', save = true) => {
      if (!editingRef.current) return true;
      editingRef.current = false;
      exitEdgeRef.current = exitTo;
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (!$isMusicNode(node)) return;
        const next = save ? draft : abc;
        if (next.trim() === '' || next.trim() === DEFAULT_ABC.trim()) {
          node.remove();
          return;
        }
        if (next !== node.getAbc()) node.setAbc(next);
      }, { discrete: true, tag: HISTORY_PUSH_TAG });
      setIsEditing(false);
      return true;
    },
    [draft, editor, abc, nodeKey],
  );

  const { attachRoot, onBlur, leave } = useEmbedDraftExit({ enabled: isEditing, dirty: draft !== (abc === '' ? DEFAULT_ABC : abc), commit }, editingRef, textareaRef);

  const startEditing = useCallback(
    (from: Edge | null = null) => {
      if (!isEditable) return;
      entryEdgeRef.current = from;
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

  const source = isEditing ? draft : abc;
  const renderError = validation?.source === source ? validation.error : null;
  const invalid = !!renderError && !validation?.unavailable;

  if (isEditing && isEditable) {
    return (
      <div key="editing" ref={attachRoot} className="editor-music-editor" onKeyDown={event => event.stopPropagation()} onBlur={onBlur}>
        <textarea
          ref={textareaRef}
          className="editor-music-input"
          value={draft}
          rows={1}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            const { selectionStart: from, selectionEnd: to, value } = event.currentTarget;
            const collapsed = from === to;
            const onFirstLine = !value.slice(0, from).includes('\n');
            const onLastLine = value.indexOf('\n', to) === -1;
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void leave();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              void leave('after');
            } else if (event.key === 'ArrowLeft' && collapsed && from === 0) {
              event.preventDefault();
              void leave('before');
            } else if (event.key === 'ArrowRight' && collapsed && to === value.length) {
              event.preventDefault();
              void leave('after');
            } else if (event.key === 'ArrowUp' && collapsed && onFirstLine) {
              event.preventDefault();
              void leave('before');
            } else if (event.key === 'ArrowDown' && collapsed && onLastLine) {
              event.preventDefault();
              void leave('after');
            }
          }}
          placeholder={DEFAULT_ABC}
          aria-label="ABC notation"
          aria-invalid={lengthError !== null || warnings.length > 0}
          aria-describedby={lengthError || warnings.length ? `music-error-${nodeKey}` : undefined}
        />
        <div className="text-xs text-muted-foreground">
          Ctrl/⌘+Enter to finish · Example: CDEF GABc | cBAG FEDC | ·{' '}
          <a className="underline" href="https://abcnotation.com/learn" target="_blank" rel="noopener noreferrer">ABC notation guide</a>
        </div>
        {validation?.source === draft && !renderError && <MusicPlayback key={draft} abc={draft} />}
        <div className="editor-music-preview" aria-hidden>
          <div ref={previewRef} />
        </div>
        <div role="status" className={lengthError ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{draft.length.toLocaleString()}/10,000 characters</div>
        {draft !== (abc === '' ? DEFAULT_ABC : abc) && <button type="button" className="text-xs text-destructive underline" onClick={() => commit('after', false)}>Discard changes</button>}
        {(lengthError || warnings.length > 0) && (
          <div id={`music-error-${nodeKey}`} role="alert" className="editor-music-error">{lengthError || warnings.join('\n')}</div>
        )}
      </div>
    );
  }

  if (renderError && !isEditable) {
    const raw = <pre className="embed-raw">{abc}</pre>;
    return <div role="note" aria-label="Unrendered music score">{abc.split('\n').length > 6 ? <details><summary>View ABC source</summary>{raw}</details> : raw}<span className="embed-render-note">could not render</span></div>;
  }

  return (
    <div
      key="rendered"
      ref={scoreBoxRef}
      data-embed-key={nodeKey}
      className={`editor-music-rendered${isSelected ? ' selected' : ''}${invalid ? ' embed-invalid' : ''}`}
      tabIndex={isEditable ? 0 : undefined}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={renderError ? `music-error-${nodeKey}` : undefined}
      onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); startEditing(); } }}
      onDoubleClick={() => startEditing()}
    >
      {renderError ? <><pre className="embed-raw">{abc}</pre><span id={`music-error-${nodeKey}`} title={renderError} className="embed-error-label">{invalid ? 'music score with errors' : renderError}</span></> : <div ref={scoreRef} role="img" aria-label="Music score" />}
      {isEditable && isSelected && <button type="button" className="inline-flex min-h-6 items-center rounded px-2 text-xs text-primary hover:bg-muted" onKeyDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); startEditing(); }}>Edit score</button>}
      {validation?.source === abc && !renderError && <MusicPlayback key={abc} abc={abc} />}
    </div>
  );
}
