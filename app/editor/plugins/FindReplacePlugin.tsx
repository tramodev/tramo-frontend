"use client"

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createRangeSelection,
  $getRoot,
  $isElementNode,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  createCommand,
  LexicalCommand,
  RootNode,
  TextNode,
} from 'lexical';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const OPEN_FIND_REPLACE_COMMAND: LexicalCommand<void> = createCommand('OPEN_FIND_REPLACE_COMMAND');

interface TextSegment {
  node: TextNode;
  start: number;
  end: number;
}

const BLOCK_SEPARATOR = '\n';

function nearestBlockKey(node: TextNode): string | null {
  let parent = node.getParent();
  while (parent !== null) {
    if ($isElementNode(parent) && !parent.isInline()) return parent.getKey();
    parent = parent.getParent();
  }
  return null;
}

function collectTextSegments(root: RootNode): { text: string; segments: TextSegment[] } {
  let text = '';
  const segments: TextSegment[] = [];
  let lastBlockKey: string | null = null;
  let node = root.getFirstChild();
  mainLoop: while (node !== null) {
    if ($isElementNode(node)) {
      const child = node.getFirstChild();
      if (child !== null) {
        node = child;
        continue;
      }
    } else if ($isTextNode(node)) {
      const blockKey = nearestBlockKey(node);
      if (lastBlockKey !== null && blockKey !== lastBlockKey) {
        text += BLOCK_SEPARATOR;
      }
      lastBlockKey = blockKey;
      const start = text.length;
      const content = node.getTextContent();
      text += content;
      segments.push({ node, start, end: start + content.length });
    }
    const sibling = node.getNextSibling();
    if (sibling !== null) {
      node = sibling;
      continue;
    }
    let parent = node.getParent();
    while (parent !== null) {
      const parentSibling = parent.getNextSibling();
      if (parentSibling !== null) {
        node = parentSibling;
        continue mainLoop;
      }
      parent = parent.getParent();
    }
    break;
  }
  return { text, segments };
}

function resolveStart(segments: TextSegment[], offset: number): { node: TextNode; offset: number } | null {
  for (const seg of segments) {
    if (offset >= seg.start && offset < seg.end) {
      return { node: seg.node, offset: offset - seg.start };
    }
  }
  const last = segments[segments.length - 1];
  return last && offset === last.end ? { node: last.node, offset: last.end - last.start } : null;
}

function resolveEnd(segments: TextSegment[], offset: number): { node: TextNode; offset: number } | null {
  for (const seg of segments) {
    if (offset > seg.start && offset <= seg.end) {
      return { node: seg.node, offset: offset - seg.start };
    }
  }
  const first = segments[0];
  return first && offset === first.start ? { node: first.node, offset: 0 } : null;
}

function getDomTextNode(element: HTMLElement | null): Text | null {
  let node: ChildNode | null = element;
  while (node !== null && node.nodeType !== Node.TEXT_NODE) {
    node = node.firstChild;
  }
  return node as Text | null;
}

const supportsCustomHighlight = typeof CSS !== 'undefined' && 'highlights' in CSS;

interface Match {
  start: number;
  end: number;
}

export default function FindReplacePlugin() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const [query, setQuery] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const highlightMatch = useCallback(
    (match: Match | null) => {
      if (!supportsCustomHighlight) return;
      if (!match) {
        CSS.highlights.delete('find-match');
        return;
      }
      const range = editor.getEditorState().read((): Range | null => {
        const { segments } = collectTextSegments($getRoot());
        const start = resolveStart(segments, match.start);
        const end = resolveEnd(segments, match.end);
        if (!start || !end) return null;
        const startDom = getDomTextNode(editor.getElementByKey(start.node.getKey()));
        const endDom = getDomTextNode(editor.getElementByKey(end.node.getKey()));
        if (!startDom || !endDom) return null;
        const domRange = new Range();
        domRange.setStart(startDom, start.offset);
        domRange.setEnd(endDom, end.offset);
        return domRange;
      });
      if (!range) {
        CSS.highlights.delete('find-match');
        return;
      }
      CSS.highlights.set('find-match', new Highlight(range));
      range.startContainer.parentElement?.scrollIntoView({ block: 'center' });
    },
    [editor],
  );

  useEffect(() => {
    if (!supportsCustomHighlight) return;
    const style = document.createElement('style');
    style.textContent = '::highlight(find-match) { background-color: rgb(250 204 21 / 0.6); color: #000; }';
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
      CSS.highlights.delete('find-match');
    };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setReplaceValue('');
    setMatches([]);
    setCurrentIndex(0);
    highlightMatch(null);
    editor.getRootElement()?.focus({ preventScroll: true });
  }, [editor, highlightMatch]);

  const openBar = useCallback(() => {
    const rootElement = editor.getRootElement();
    const referenceElement = rootElement?.closest<HTMLElement>('.editor-inner') ?? rootElement;
    if (referenceElement) {
      const rect = referenceElement.getBoundingClientRect();
      setPosition({ top: rect.top + 8, right: window.innerWidth - rect.right + 8 });
    }
    setOpen(true);
    const input = searchInputRef.current;
    if (input) input.select();
    else requestAnimationFrame(() => searchInputRef.current?.select());
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      OPEN_FIND_REPLACE_COMMAND,
      () => {
        openBar();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, openBar]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'f' && event.key !== 'F') return;
      if (!event.metaKey && !event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (target === null) return;
      const container = editor.getRootElement()?.closest('.editor-container');
      if (!container?.contains(target) && target.closest('.find-replace-bar') === null) return;
      event.preventDefault();
      openBar();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, openBar]);

  const findMatches = useCallback(
    (needleRaw: string): Match[] => {
      if (needleRaw === '') return [];
      const found: Match[] = [];
      editor.getEditorState().read(() => {
        const { text } = collectTextSegments($getRoot());
        const haystack = text.toLowerCase();
        const needle = needleRaw.toLowerCase();
        let from = 0;
        while (from <= haystack.length) {
          const index = haystack.indexOf(needle, from);
          if (index === -1) break;
          found.push({ start: index, end: index + needle.length });
          from = index + needle.length;
        }
      });
      return found;
    },
    [editor],
  );

  const runSearch = useCallback(
    (next: string) => {
      setQuery(next);
      const found = findMatches(next);
      setMatches(found);
      setCurrentIndex(0);
      highlightMatch(found.length > 0 ? found[0] : null);
    },
    [findMatches, highlightMatch],
  );

  const goToMatch = (index: number) => {
    if (matches.length === 0) return;
    const next = ((index % matches.length) + matches.length) % matches.length;
    setCurrentIndex(next);
    highlightMatch(matches[next]);
  };

  const replaceCurrent = () => {
    if (matches.length === 0) return;
    const match = matches[currentIndex];
    editor.update(() => {
      const { segments } = collectTextSegments($getRoot());
      const start = resolveStart(segments, match.start);
      const end = resolveEnd(segments, match.end);
      if (!start || !end) return;
      const selection = $createRangeSelection();
      selection.anchor.set(start.node.getKey(), start.offset, 'text');
      selection.focus.set(end.node.getKey(), end.offset, 'text');
      $setSelection(selection);
      selection.insertText(replaceValue);
    });
    const found = findMatches(query);
    setMatches(found);
    const nextIndex = Math.min(currentIndex, Math.max(found.length - 1, 0));
    setCurrentIndex(nextIndex);
    highlightMatch(found.length > 0 ? found[nextIndex] : null);
    setTimeout(() => replaceInputRef.current?.focus(), 0);
  };

  const replaceAll = () => {
    if (matches.length === 0) return;
    const inReverseOrder = [...matches].sort((a, b) => b.start - a.start);
    editor.update(() => {
      for (const match of inReverseOrder) {
        const { segments } = collectTextSegments($getRoot());
        const start = resolveStart(segments, match.start);
        const end = resolveEnd(segments, match.end);
        if (!start || !end) continue;
        const selection = $createRangeSelection();
        selection.anchor.set(start.node.getKey(), start.offset, 'text');
        selection.focus.set(end.node.getKey(), end.offset, 'text');
        $setSelection(selection);
        selection.insertText(replaceValue);
      }
    });
    setMatches([]);
    setCurrentIndex(0);
    highlightMatch(null);
    setTimeout(() => replaceInputRef.current?.focus(), 0);
  };

  if (!open || !position) return null;

  return createPortal(
    <div
      className="find-replace-bar"
      style={{ top: position.top, right: position.right }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="find-replace-row">
        <Search size={14} className="find-replace-icon" />
        <input
          ref={searchInputRef}
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              goToMatch(e.shiftKey ? currentIndex - 1 : currentIndex + 1);
            }
            if (e.key === 'Escape') close();
          }}
          placeholder="Find"
        />
        <span className="find-replace-count">
          {matches.length > 0 ? `${currentIndex + 1}/${matches.length}` : query ? '0/0' : ''}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => goToMatch(currentIndex - 1)} aria-label="Previous match" disabled={matches.length === 0}>
              <ChevronUp size={15} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Previous</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => goToMatch(currentIndex + 1)} aria-label="Next match" disabled={matches.length === 0}>
              <ChevronDown size={15} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Next</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={close} aria-label="Close find and replace">
              <X size={15} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Close</TooltipContent>
        </Tooltip>
      </div>
      <div className="find-replace-row">
        <input
          ref={replaceInputRef}
          value={replaceValue}
          onChange={(e) => setReplaceValue(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              replaceCurrent();
            }
            if (e.key === 'Escape') close();
          }}
          placeholder="Replace"
        />
        <button onClick={replaceCurrent} disabled={matches.length === 0} className="find-replace-text-button">
          Replace
        </button>
        <button onClick={replaceAll} disabled={matches.length === 0} className="find-replace-text-button">
          Replace All
        </button>
      </div>
    </div>,
    document.body,
  );
}
