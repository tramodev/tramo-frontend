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
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isTextNode,
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
import katex from 'katex';
import { equationError, KATEX_OPTS } from '@/app/editor/embed-validity';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { $isEquationNode } from '@/app/editor/nodes/EquationNode';
import { $caretOnEdgeLine, $caretTouches, editingDecorators, type Edge } from '@/app/editor/plugins/decoratorCaret';
import { useEmbedDraftExit } from '@/app/editor/plugins/useEmbedDraftExit';

interface EquationComponentProps {
  equation: string;
  inline: boolean;
  nodeKey: NodeKey;
}

const TEMPLATES: { label: string; title: string; latex: string; at: number; len: number }[] = [
  { label: 'a/b', title: 'Fraction', latex: '\\frac{}{}', at: 6, len: 0 },
  { label: '√', title: 'Square root', latex: '\\sqrt{}', at: 6, len: 0 },
  { label: 'x²', title: 'Superscript', latex: '^{}', at: 2, len: 0 },
  { label: 'xᵢ', title: 'Subscript', latex: '_{}', at: 2, len: 0 },
  { label: 'Σ', title: 'Summation', latex: '\\sum_{i=1}^{n} ', at: 15, len: 0 },
  { label: '∫', title: 'Integral', latex: '\\int_{a}^{b} ', at: 13, len: 0 },
  { label: 'lim', title: 'Limit', latex: '\\lim_{x \\to 0} ', at: 15, len: 0 },
  { label: '(⋯)', title: 'Matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', at: 16, len: 1 },
  { label: '{', title: 'Piecewise function', latex: '\\begin{cases}  \\\\  \\end{cases}', at: 14, len: 0 },
  { label: 'π', title: 'Greek letter', latex: '\\pi ', at: 1, len: 2 },
];

function renderKatex(target: HTMLElement, equation: string, inline: boolean): string | null {
  target.removeAttribute('title');
  try {
    if (equation.length > 10000) throw new Error('Equations must not exceed 10,000 characters.');
    katex.render(equation, target, {
      displayMode: !inline,
      ...KATEX_OPTS,
    });
    return null;
  } catch (parseError) {
    const message = String((parseError as Error).message).replace(/^KaTeX parse error:\s*/, '');
    target.textContent = equation.slice(0, 10000);
    target.title = message;
    return message;
  }
}

function $placeCaret(node: LexicalNode, edge: Edge) {
  if (!$isEquationNode(node)) return;
  if (node.isInline()) {
    const neighbour = edge === 'after' ? node.getNextSibling() : node.getPreviousSibling();
    if ($isTextNode(neighbour)) {
      if (edge === 'after') neighbour.select(0, 0);
      else neighbour.select(neighbour.getTextContentSize(), neighbour.getTextContentSize());
      return;
    }
    const caret = $createTextNode('');
    if (edge === 'after') node.insertAfter(caret);
    else node.insertBefore(caret);
    caret.select();
    return;
  }
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

export default function EquationComponent({
  equation,
  inline,
  nodeKey,
}: EquationComponentProps) {
  const [editor] = useLexicalComposerContext();
  const isEditable = editor.isEditable();
  const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);
  const [isEditing, setIsEditing] = useState(() => editingDecorators.get(editor)?.has(nodeKey) === true);
  const [draft, setDraft] = useState(equation);
  const [error, setError] = useState<string | null>(() => equationError(equation, inline));
  const [templateIndex, setTemplateIndex] = useState(0);
  const katexRef = useRef<HTMLSpanElement | null>(null);
  const previewRef = useRef<HTMLSpanElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const entryEdgeRef = useRef<Edge | null>(null);
  const exitEdgeRef = useRef<Edge | null>(null);
  const editingRef = useRef(isEditing);

  useLayoutEffect(() => {
    editingDecorators.get(editor)?.delete(nodeKey);
  }, [editor, nodeKey]);

  useLayoutEffect(() => {
    if (isEditing || katexRef.current === null) return;
    setError(renderKatex(katexRef.current, equation, inline));
  }, [equation, inline, isEditing]);

  useLayoutEffect(() => {
    if (!isEditing || previewRef.current === null) return;
    setError(renderKatex(previewRef.current, draft || '\\;', inline));
  }, [draft, inline, isEditing]);

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
      if ($isEquationNode(node)) setDraft(node.getEquation());
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

  const pendingSelection = useRef<[number, number] | null>(null);
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea === null || pendingSelection.current === null) return;
    const [from, to] = pendingSelection.current;
    pendingSelection.current = null;
    textarea.focus();
    textarea.setSelectionRange(from, to);
  }, [draft]);

  const insertTemplate = useCallback(
    (latex: string, at: number, len: number) => {
      const textarea = textareaRef.current;
      if (textarea === null) return;
      const from = textarea.selectionStart;
      const to = textarea.selectionEnd;
      setDraft(draft.slice(0, from) + latex + draft.slice(to));
      pendingSelection.current = [from + at, from + at + len];
    },
    [draft],
  );

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
      if (save && draft.trim() && draft.length > 10000) {
        setError('Equations must not exceed 10,000 characters.');
        return false;
      }
      editingRef.current = false;
      exitEdgeRef.current = exitTo;
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (!$isEquationNode(node)) return;
        const next = save ? draft : equation;
        if (next.trim() === '') {
          node.remove();
          return;
        }
        if (next !== node.getEquation()) node.setEquation(next);
      }, { discrete: true, tag: HISTORY_PUSH_TAG });
      setIsEditing(false);
      return true;
    },
    [draft, editor, equation, nodeKey],
  );

  const { attachRoot, onBlur, leave } = useEmbedDraftExit({ enabled: isEditing, dirty: draft !== equation, commit }, editingRef, textareaRef);

  const startEditing = useCallback(
    (from: Edge | null = null) => {
      if (!isEditable) return;
      entryEdgeRef.current = from;
      editingRef.current = true;
      setDraft(equation);
      setIsEditing(true);
    },
    [equation, isEditable],
  );

  const onDelete = useCallback(
    (event: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);
        if ($isEquationNode(node)) {
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
      if (!$isEquationNode(node) || !$caretTouches(node, edge)) return false;
      event.preventDefault();
      startEditing(edge);
      return true;
    },
    [nodeKey, startEditing],
  );

  const enterFromLine = useCallback(
    (edge: Edge) => (event: KeyboardEvent) => {
      const node = $getNodeByKey(nodeKey);
      if (!$isEquationNode(node) || !$caretOnEdgeLine(node, edge, editor)) return false;
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
          if (katexRef.current !== null && katexRef.current.contains(event.target as Node)) {
            if (event.detail >= 2) {
              startEditing();
              return true;
            }
            if (inline) return false;
            clearSelected();
            setSelected(true);
            return true;
          }
          return false;
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
  }, [clearSelected, editor, enterFrom, enterFromLine, inline, isEditable, isEditing, isSelected, onDelete, setSelected, startEditing]);

  if (isEditing && isEditable) {
    return (
      <span
        key="editing"
        ref={attachRoot}
        onBlur={onBlur}
        onKeyDown={event => event.stopPropagation()}
        className={inline ? 'editor-equation-editor inline' : 'editor-equation-editor'}
      >
        <textarea
          ref={textareaRef}
          className="editor-equation-input"
          value={draft}
          rows={1}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            const textarea = event.currentTarget;
            const collapsed = textarea.selectionStart === textarea.selectionEnd;
            const onFirstLine = !textarea.value.slice(0, textarea.selectionStart).includes('\n');
            const onLastLine = !textarea.value.slice(textarea.selectionEnd).includes('\n');
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void leave();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              void leave('after');
            } else if (event.key === 'ArrowLeft' && collapsed && textarea.selectionStart === 0) {
              event.preventDefault();
              void leave('before');
            } else if (
              event.key === 'ArrowRight' &&
              collapsed &&
              textarea.selectionEnd === textarea.value.length
            ) {
              event.preventDefault();
              void leave('after');
            } else if (event.key === 'ArrowUp' && collapsed && onFirstLine) {
              event.preventDefault();
              void leave('before');
            } else if (
              event.key === 'ArrowDown' &&
              collapsed &&
              onLastLine
            ) {
              event.preventDefault();
              void leave('after');
            }
          }}
          placeholder={inline ? 'a + b' : '\\frac{a}{b}'}
          aria-label="LaTeX equation"
          aria-invalid={error !== null}
          aria-describedby={error ? `equation-error-${nodeKey}` : undefined}
        />
        <span className="editor-equation-palette" role="toolbar" aria-label="Equation templates" onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
          const index = buttons.indexOf(event.target as HTMLButtonElement);
          if (index < 0) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
          setTemplateIndex(next);
          buttons[next]?.focus();
        }}>
          {TEMPLATES.map(({ label, title, latex, at, len }, index) => (
            <button
              key={title}
              type="button"
              title={title}
              aria-label={title}
              tabIndex={index === templateIndex ? 0 : -1}
              className="editor-equation-template"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertTemplate(latex, at, len)}
            >
              {label}
            </button>
          ))}
        </span>
        <span className="editor-equation-preview" ref={previewRef} aria-hidden />
        {error !== null && <span id={`equation-error-${nodeKey}`} role="alert" className="editor-equation-error">{error}</span>}
      </span>
    );
  }

  const renderedError = equationError(equation, inline);
  if (renderedError && !isEditable) {
    const Source = inline ? 'code' : 'pre';
    return <span role="note" aria-label="Unrendered equation"><Source className="embed-raw">{equation}</Source><span className="embed-render-note">could not render</span></span>;
  }

  return (
    <>
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          key="rendered"
          ref={katexRef}
          data-embed-key={nodeKey}
          aria-invalid={renderedError ? true : undefined}
          aria-describedby={renderedError ? `equation-error-${nodeKey}` : undefined}
          tabIndex={renderedError ? 0 : undefined}
          className={`editor-equation-rendered${isSelected ? ' selected' : ''}${renderedError ? ' embed-invalid' : ''}`}
          onDoubleClick={() => startEditing()}
          onKeyDown={event => {
            event.stopPropagation();
            if (event.key === 'Enter') { event.preventDefault(); startEditing(); }
          }}
        />
      </TooltipTrigger>
      {renderedError && <TooltipContent className="max-w-xs">{renderedError}</TooltipContent>}
    </Tooltip>
    {renderedError && <span id={`equation-error-${nodeKey}`} className="embed-error-label">equation with errors</span>}
    {isEditable && isSelected && <button type="button" className="inline-flex min-h-6 items-center rounded px-2 text-xs text-primary hover:bg-muted" onKeyDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); startEditing(); }}>Edit equation</button>}
    </>
  );
}
