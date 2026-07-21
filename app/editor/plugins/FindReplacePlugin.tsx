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

// Deliberately not using @lexical/text's $rootTextContent + $findTextIntersectionFromCharacters:
// ElementNode.getTextContent() inserts "\n\n" between sibling blocks, but
// $findTextIntersectionFromCharacters's character count does NOT account for that separator,
// so the two disagree on offsets past the first paragraph. Keeping both sides of the math
// in one self-consistent walk (zero separator throughout) avoids that mismatch entirely.
function collectTextSegments(root: RootNode): { text: string; segments: TextSegment[] } {
  let text = '';
  const segments: TextSegment[] = [];
  let node = root.getFirstChild();
  mainLoop: while (node !== null) {
    if ($isElementNode(node)) {
      const child = node.getFirstChild();
      if (child !== null) {
        node = child;
        continue;
      }
    } else if ($isTextNode(node)) {
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

function resolveOffset(segments: TextSegment[], offset: number): { node: TextNode; offset: number } | null {
  for (const seg of segments) {
    if (offset >= seg.start && offset <= seg.end) {
      return { node: seg.node, offset: offset - seg.start };
    }
  }
  return null;
}

// A TextNode's DOM can be a bare <span> (plain text) or nested outerTag/innerTag
// elements (bold/italic/etc.), so the actual Text node isn't always .firstChild directly.
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

  // Paints the current match via the CSS Custom Highlight API instead of a real Lexical/DOM
  // Selection. A real selection would steal focus away from the find bar's input the moment
  // the user types (Lexical syncs its selection onto the contenteditable on every update),
  // but a Highlight paints an arbitrary Range independent of document.activeElement entirely.
  const highlightMatch = useCallback(
    (match: Match | null) => {
      if (!supportsCustomHighlight) return;
      if (!match) {
        CSS.highlights.delete('find-match');
        return;
      }
      const range = editor.getEditorState().read((): Range | null => {
        const { segments } = collectTextSegments($getRoot());
        const start = resolveOffset(segments, match.start);
        const end = resolveOffset(segments, match.end);
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

  // Next's build-time CSS parser doesn't recognize ::highlight()'s functional pseudo-element
  // syntax yet and fails the whole stylesheet on it, so this styling is injected at runtime instead.
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
  }, [highlightMatch]);

  const openBar = useCallback(() => {
    const rootElement = editor.getRootElement();
    // Anchor to .editor-inner (the area right below the toolbar row), not
    // .editor-container (the whole card, which starts at the toolbar itself) — top-right,
    // just below the tools instead of on top of them.
    const referenceElement = rootElement?.closest<HTMLElement>('.editor-inner') ?? rootElement;
    if (referenceElement) {
      const rect = referenceElement.getBoundingClientRect();
      setPosition({ top: rect.top + 8, right: window.innerWidth - rect.right + 8 });
    }
    setOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
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

  // Lexical's KEY_MODIFIER_COMMAND only fires while the contenteditable itself has DOM
  // focus. If focus is anywhere else on the editor page (the title input, the sidebar,
  // nothing at all) that keydown never reaches Lexical, so the browser's native find bar
  // opens instead. A plain window-level listener covers every case uniformly — it's
  // naturally scoped to this plugin's own mount lifetime (only while an idea is open).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'f' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        openBar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openBar]);

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

  useEffect(() => {
    if (!open) return;
    const found = findMatches(query);
    setMatches(found);
    setCurrentIndex(0);
    highlightMatch(found.length > 0 ? found[0] : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  const goToMatch = (index: number) => {
    if (matches.length === 0) return;
    const next = ((index % matches.length) + matches.length) % matches.length;
    setCurrentIndex(next);
    highlightMatch(matches[next]);
  };

  // Replace genuinely needs a real Lexical selection (to call insertText), which does steal
  // focus from the replace input — refocus afterward, same as before this file's highlight fix.
  const replaceCurrent = () => {
    if (matches.length === 0) return;
    const match = matches[currentIndex];
    editor.update(() => {
      const { segments } = collectTextSegments($getRoot());
      const start = resolveOffset(segments, match.start);
      const end = resolveOffset(segments, match.end);
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
        const start = resolveOffset(segments, match.start);
        const end = resolveOffset(segments, match.end);
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
          onChange={(e) => setQuery(e.target.value)}
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
