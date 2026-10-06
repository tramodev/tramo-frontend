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
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';
import katex from 'katex';
import { $isEquationNode } from '../nodes/EquationNode';
import { $caretOnEdgeLine, $caretTouches, type Edge } from './decoratorCaret';
import { freshlyInserted } from './EquationsPlugin';

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
  try {
    katex.render(equation, target, {
      displayMode: !inline,
      throwOnError: true,
      trust: false,
      strict: 'warn',
      output: 'html',
    });
    return null;
  } catch (parseError) {
    katex.render(equation, target, {
      displayMode: !inline,
      throwOnError: false,
      trust: false,
      strict: 'warn',
      output: 'html',
    });
    return String((parseError as Error).message).replace(/^KaTeX parse error:\s*/, '');
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

export default function EquationComponent({
  equation,
  inline,
  nodeKey,
}: EquationComponentProps) {
  const [editor] = useLexicalComposerContext();
  const isEditable = editor.isEditable();
  const [isSelected, setSelected, clearSelected] = useLexicalNodeSelection(nodeKey);
  const [isEditing, setIsEditing] = useState(() => freshlyInserted.delete(nodeKey));
  const [draft, setDraft] = useState(equation);
  const [error, setError] = useState<string | null>(null);
  const katexRef = useRef<HTMLSpanElement | null>(null);
  const previewRef = useRef<HTMLSpanElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const entryEdgeRef = useRef<Edge | null>(null);
  const exitEdgeRef = useRef<Edge | null>(null);

  const discardedOnMount = useRef(false);
  useEffect(() => {
    if (discardedOnMount.current) return;
    discardedOnMount.current = true;
    if (!isEditable || isEditing || equation !== '') return;
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isEquationNode(node)) node.remove();
    });
  }, [editor, equation, isEditable, isEditing, nodeKey]);

  useEffect(() => {
    if (isEditing || katexRef.current === null) return;
    renderKatex(katexRef.current, equation, inline);
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

  const pendingSelection = useRef<[number, number] | null>(null);
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea === null || pendingSelection.current === null) return;
    const [from, to] = pendingSelection.current;
    pendingSelection.current = null;
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
    (exitTo: Edge | null = 'after') => {
      const next = draft.trim();
      if (next === '') {
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isEquationNode(node)) node.remove();
        });
        setIsEditing(false);
        return;
      }
      if (next !== equation) {
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isEquationNode(node)) node.setEquation(next);
        });
      }
      exitEdgeRef.current = exitTo;
      setIsEditing(false);
    },
    [draft, editor, equation, nodeKey],
  );

  const cancel = useCallback(() => {
    if (equation === '') {
      if (draft.trim() !== '') {
        commit();
        return;
      }
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isEquationNode(node)) node.remove();
      });
      setIsEditing(false);
      return;
    }
    setDraft(equation);
    exitEdgeRef.current = 'after';
    setIsEditing(false);
  }, [commit, draft, editor, equation, nodeKey]);

  const startEditing = useCallback(
    (from: Edge | null = null) => {
      if (!isEditable) return;
      entryEdgeRef.current = from;
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
        className={inline ? 'editor-equation-editor inline' : 'editor-equation-editor'}
      >
        <textarea
          ref={textareaRef}
          className="editor-equation-input"
          value={draft}
          rows={1}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit()}
          onKeyDown={(event) => {
            event.stopPropagation();
            const textarea = event.currentTarget;
            const collapsed = textarea.selectionStart === textarea.selectionEnd;
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              commit();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              cancel();
            } else if (event.key === 'ArrowLeft' && collapsed && textarea.selectionStart === 0) {
              event.preventDefault();
              commit('before');
            } else if (
              event.key === 'ArrowRight' &&
              collapsed &&
              textarea.selectionEnd === textarea.value.length
            ) {
              event.preventDefault();
              commit('after');
            } else if (event.key === 'ArrowUp' && collapsed && textarea.selectionStart === 0) {
              event.preventDefault();
              commit('before');
            } else if (
              event.key === 'ArrowDown' &&
              collapsed &&
              textarea.selectionEnd === textarea.value.length
            ) {
              event.preventDefault();
              commit('after');
            }
          }}
          placeholder={inline ? 'a + b' : '\\frac{a}{b}'}
          aria-label="LaTeX equation"
        />
        <span className="editor-equation-palette">
          {TEMPLATES.map(({ label, title, latex, at, len }) => (
            <button
              key={title}
              type="button"
              title={title}
              aria-label={title}
              className="editor-equation-template"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertTemplate(latex, at, len)}
            >
              {label}
            </button>
          ))}
        </span>
        <span className="editor-equation-preview" ref={previewRef} aria-hidden />
        {error !== null && <span className="editor-equation-error">{error}</span>}
      </span>
    );
  }

  return (
    <span
      key="rendered"
      ref={katexRef}
      className={isSelected ? 'editor-equation-rendered selected' : 'editor-equation-rendered'}
      onDoubleClick={() => startEditing()}
    />
  );
}
