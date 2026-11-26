// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import * as React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import katex from 'katex';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $setSelection,
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
  HISTORY_MERGE_TAG,
  HISTORY_PUSH_TAG,
  SKIP_DOM_SELECTION_TAG,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';
import { $isGraphNode } from '@/app/editor/nodes/GraphNode';
import { $caretOnEdgeLine, $caretTouches, editingDecorators, textareaCaretRows, type Edge } from '@/app/editor/plugins/decoratorCaret';
import { KATEX_OPTS } from '@/app/editor/embed-validity';
import { compileGraph } from '@/app/editor/graph-function';
import { useEmbedDraftExit } from '@/app/editor/plugins/useEmbedDraftExit';
import { setPendingEmbedDraft } from '@/app/editor/embed-draft-status';

interface GraphComponentProps {
  equation: string;
  nodeKey: NodeKey;
  invalidSource?: boolean;
}

const WIDTH = 480;
const HEIGHT = 280;
const DOMAIN = 10;
const SAMPLES = 480;

function graphOf(equation: string) {
  if (equation.length > 10000) return { fn: null, error: 'Graphs must not exceed 10,000 characters. Shorten this function to save it.' };
  return compileGraph(equation);
}

function plot(fn: (x: number) => number) {
  const points: [number, number][] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const x = -DOMAIN + (2 * DOMAIN * i) / SAMPLES;
    points.push([x, fn(x)]);
  }
  const ys = points.map(([, y]) => y).filter(Number.isFinite).sort((a, b) => a - b);
  if (!ys.length) return null;
  let low = ys[Math.floor(ys.length * 0.02)], high = ys[Math.ceil(ys.length * 0.98) - 1];
  if (high - low < 1e-9) { low -= 1; high += 1; }
  const pad = (high - low) * 0.1;
  low -= pad;
  high += pad;
  const sx = (x: number) => ((x + DOMAIN) / (2 * DOMAIN)) * WIDTH;
  const sy = (y: number) => HEIGHT - ((y - low) / (high - low)) * HEIGHT;
  const segments: string[] = [];
  let current: string[] = [];
  let previous: number | null = null;
  for (const [x, y] of points) {
    const jump = previous !== null && Math.abs(y - previous) > (high - low) * 2;
    if (!Number.isFinite(y) || jump) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
    }
    if (Number.isFinite(y)) current.push(`${sx(x).toFixed(1)},${sy(Math.max(low - (high - low), Math.min(high + (high - low), y))).toFixed(1)}`);
    previous = Number.isFinite(y) ? y : null;
  }
  if (current.length > 1) segments.push(current.join(' '));
  return { segments, low, high, xAxis: low <= 0 && high >= 0 ? sy(0) : null, yAxis: sx(0) };
}

const label = (value: number) => Number(value.toPrecision(3)).toString();

function GraphView({ equation }: { equation: string }) {
  const formulaRef = useRef<HTMLDivElement | null>(null);
  const { fn } = useMemo(() => graphOf(equation), [equation]);
  const drawn = useMemo(() => (fn ? plot(fn) : null), [fn]);

  useEffect(() => {
    const target = formulaRef.current;
    if (!target) return;
    try { katex.render(equation, target, { ...KATEX_OPTS, displayMode: true }); }
    catch { target.textContent = equation; }
  }, [equation]);

  return (
    <>
      <div ref={formulaRef} className="editor-graph-formula" />
      {drawn ? (
        <svg className="editor-graph-plot" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Graph of ${equation} for x from -${DOMAIN} to ${DOMAIN}`}>
          {drawn.xAxis !== null && <line className="editor-graph-axis" x1={0} x2={WIDTH} y1={drawn.xAxis} y2={drawn.xAxis} />}
          <line className="editor-graph-axis" x1={drawn.yAxis} x2={drawn.yAxis} y1={0} y2={HEIGHT} />
          {drawn.segments.map((points, index) => <polyline key={index} className="editor-graph-curve" points={points} />)}
          <text className="editor-graph-label" x={drawn.yAxis + 4} y={12}>{label(drawn.high)}</text>
          <text className="editor-graph-label" x={drawn.yAxis + 4} y={HEIGHT - 4}>{label(drawn.low)}</text>
          <text className="editor-graph-label" x={4} y={(drawn.xAxis ?? HEIGHT) - 4}>-{DOMAIN}</text>
          <text className="editor-graph-label" x={WIDTH - 4} y={(drawn.xAxis ?? HEIGHT) - 4} textAnchor="end">{DOMAIN}</text>
        </svg>
      ) : fn && <p className="text-xs text-muted-foreground">This function has no real values between -{DOMAIN} and {DOMAIN}.</p>}
    </>
  );
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

export default function GraphComponent({ equation, nodeKey, invalidSource = false }: GraphComponentProps) {
  const [editor] = useLexicalComposerContext();
  const isEditable = editor.isEditable();
  const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);
  const [isEditing, setIsEditing] = useState(() => editingDecorators.get(editor)?.has(nodeKey) === true);
  const [draft, setDraft] = useState(equation);
  const [preview, setPreview] = useState(equation);
  const pushedRef = useRef(false);
  const pushedDraft = useRef(draft);
  const lengthError = draft.length > 10000 ? 'Graphs must not exceed 10,000 characters. Shorten this function to save it.' : null;
  const [original, setOriginal] = useState(equation);
  const graphBoxRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const entryEdgeRef = useRef<Edge | null>(null);
  const exitEdgeRef = useRef<Edge | null>(null);
  const editingRef = useRef(isEditing);
  const pendingToken = useRef({});

  useEffect(() => {
    const token = pendingToken.current;
    setPendingEmbedDraft(token, isEditing && draft !== equation);
    return () => setPendingEmbedDraft(token, false);
  }, [isEditing, draft, equation]);

  useLayoutEffect(() => {
    editingDecorators.get(editor)?.delete(nodeKey);
  }, [editor, nodeKey]);

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
      if ($isGraphNode(node)) setDraft(node.getEquation());
    });
  }), [editor, nodeKey]);

  useEffect(() => {
    if (!isEditing || draft === equation || !draft.trim()) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft, equation, isEditing]);

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

  useEffect(() => {
    if (!isEditing || !draft.trim() || draft.length > 10000 || draft === pushedDraft.current) return;
    const timer = setTimeout(() => {
      if (!editingRef.current) return;
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isGraphNode(node) && node.getEquation() !== draft) node.setEquation(draft);
      }, { tag: [pushedRef.current ? HISTORY_MERGE_TAG : HISTORY_PUSH_TAG, SKIP_DOM_SELECTION_TAG] });
      pushedRef.current = true;
      pushedDraft.current = draft;
    }, 150);
    return () => clearTimeout(timer);
  }, [draft, editor, isEditing, nodeKey]);

  const commit = useCallback(
    (exitTo: Edge | null = 'after', save = true) => {
      if (!editingRef.current) return true;
      if (save && draft.length > 10000 && draft.trim() && draft !== equation) return null;
      editingRef.current = false;
      exitEdgeRef.current = exitTo;
      if (save) editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (!$isGraphNode(node)) return;
        if (draft.trim() === '') {
          if (exitTo) $placeCaret(node, exitTo);
          node.remove();
          return;
        }
        if (draft !== node.getEquation()) node.setEquation(draft);
      }, { discrete: true, tag: pushedRef.current ? HISTORY_MERGE_TAG : HISTORY_PUSH_TAG });
      setIsEditing(false);
      return true;
    },
    [draft, editor, equation, nodeKey],
  );

  const discard = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isGraphNode(node) && node.getEquation() !== original) node.setEquation(original);
    }, { discrete: true, tag: HISTORY_MERGE_TAG });
    commit('after', false);
  }, [commit, editor, nodeKey, original]);

  const { attachRoot, onBlur, leave } = useEmbedDraftExit({ enabled: isEditing, localOnly: !!lengthError && !!draft.trim(), dirty: draft !== equation, commit }, editingRef, textareaRef);

  const startEditing = useCallback(
    (from: Edge | null = null) => {
      if (!isEditable) return;
      entryEdgeRef.current = from;
      editor.update(() => {
        if ($isNodeSelection($getSelection())) $setSelection(null);
      }, { tag: SKIP_DOM_SELECTION_TAG });
      editingRef.current = true;
      pushedRef.current = false;
      pushedDraft.current = equation;
      setDraft(equation);
      setPreview(equation);
      setOriginal(equation);
      setIsEditing(true);
    },
    [equation, editor, isEditable],
  );

  const onDelete = useCallback(
    (event: KeyboardEvent) => {
      const selection = $getSelection();
      if (!isSelected || !$isNodeSelection(selection)) return false;
      event.preventDefault();
      selection.deleteNodes();
      return true;
    },
    [isSelected],
  );

  const enterFrom = useCallback(
    (edge: Edge) => (event: KeyboardEvent) => {
      const node = $getNodeByKey(nodeKey);
      if (event.shiftKey || !$isGraphNode(node) || !$caretTouches(node, edge)) return false;
      event.preventDefault();
      startEditing(edge);
      return true;
    },
    [nodeKey, startEditing],
  );

  const enterFromLine = useCallback(
    (edge: Edge) => (event: KeyboardEvent) => {
      const node = $getNodeByKey(nodeKey);
      if (event.shiftKey || !$isGraphNode(node) || !$caretOnEdgeLine(node, edge, editor)) return false;
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
          if (graphBoxRef.current === null || !graphBoxRef.current.contains(event.target as Node)) {
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

  const source = isEditing ? draft : equation;
  const { error } = useMemo(() => graphOf(source), [source]);
  const renderError = invalidSource && !isEditing ? 'Saved graph source is not text. Replace it to publish this note.' : error;

  if (isEditing && isEditable) {
    const draftError = draft.trim() ? lengthError ?? error : null;
    return (
      <div key="editing" ref={attachRoot} className="editor-music-editor" onKeyDown={event => event.stopPropagation()} onBlur={onBlur}>
        <textarea
          ref={textareaRef}
          className="editor-music-input"
          value={draft}
          rows={1}
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            if (next.trim() && !graphOf(next).error) setPreview(next);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            const { selectionStart: from, selectionEnd: to, value } = event.currentTarget;
            const collapsed = from === to;
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void leave();
            } else if (event.key === 'Backspace' && value === '') {
              event.preventDefault();
              void leave('before');
            } else if (event.key === 'Escape') {
              event.preventDefault();
              void leave('after');
            } else if (event.key === 'ArrowLeft' && collapsed && from === 0) {
              event.preventDefault();
              void leave('before');
            } else if (event.key === 'ArrowRight' && collapsed && to === value.length) {
              event.preventDefault();
              void leave('after');
            } else if (event.key === 'ArrowUp' && collapsed && textareaCaretRows(event.currentTarget).first) {
              event.preventDefault();
              void leave('before');
            } else if (event.key === 'ArrowDown' && collapsed && textareaCaretRows(event.currentTarget).last) {
              event.preventDefault();
              void leave('after');
            }
          }}
          placeholder="f(x) = \sin x"
          aria-label="Function in LaTeX"
          aria-invalid={draftError !== null}
          aria-describedby={draftError ? `graph-error-${nodeKey}` : undefined}
        />
        <div className="text-xs text-muted-foreground">
          Ctrl/⌘+Enter to finish · Write a function of x in LaTeX, like f(x) = \frac{'{1}{x}'} or y = e^{'{-x^2}'}
        </div>
        {draft.trim() && preview.trim() && <div className={`editor-music-preview${draftError ? ' editor-graph-stale' : ''}`} aria-hidden><GraphView equation={preview} /></div>}
        <div role="status" className={lengthError ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{draft.length.toLocaleString()}/10,000 characters</div>
        {draft !== original && <button type="button" className="text-xs text-destructive underline" onClick={discard}>Discard changes</button>}
        {draftError && <div id={`graph-error-${nodeKey}`} role="alert" className="editor-music-error">{draftError}</div>}
      </div>
    );
  }

  if (renderError && !isEditable) {
    return <div role="note" aria-label="Unrendered graph"><pre className="embed-raw">{equation}</pre><span className="embed-render-note">could not render</span></div>;
  }

  return (
    <div
      key="rendered"
      ref={graphBoxRef}
      data-embed-key={nodeKey}
      className={`editor-music-rendered${isSelected ? ' selected' : ''}${renderError ? ' embed-invalid' : ''}`}
      tabIndex={isEditable ? 0 : undefined}
      aria-invalid={renderError ? true : undefined}
      aria-describedby={renderError ? `graph-error-${nodeKey}` : undefined}
      onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); startEditing(); } }}
      onDoubleClick={() => startEditing()}
    >
      {renderError ? <><pre className="embed-raw">{equation}</pre><span id={`graph-error-${nodeKey}`} title={renderError} className="embed-error-label">graph with errors</span></> : <GraphView equation={equation} />}
      {isEditable && isSelected && <button type="button" className="inline-flex min-h-6 items-center rounded px-2 text-xs text-primary hover:bg-muted" onKeyDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); startEditing(); }}>Edit graph</button>}
    </div>
  );
}
