// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import type { EditorState } from 'lexical';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $getSelection, $isRangeSelection, $isTextNode, $nodesOfType, COMMAND_PRIORITY_HIGH, KEY_ARROW_UP_COMMAND, KEY_ARROW_DOWN_COMMAND, type LexicalEditor } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { useScrollSpy } from '@/hooks/use-scroll-spy';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useBasicTypeaheadTriggerMatch } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { EDITOR_TRANSFORMERS } from '../../plugins/markdownTransformers';

import ToolbarPlugin from '../../plugins/ToolbarPlugin';
import { EditorImagesProvider } from '@/components/editor/editor-images-provider';
import ImagesPlugin from '../../plugins/ImagesPlugin';
import EquationsPlugin from '../../plugins/EquationsPlugin';
import MusicPlugin from '../../plugins/MusicPlugin';
import EmbedsPlugin from '@/app/editor/plugins/EmbedsPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { CodeBlockGuardPlugin } from '../../plugins/CodeBlockGuardPlugin';
import ListTabPlugin from '../../plugins/ListTabPlugin';
import PastePlugin from '../../plugins/PastePlugin';
import CodeHighlightPlugin from '../../plugins/CodeHighlightPlugin';
import CodeLanguagePlugin from '../../plugins/CodeLanguagePlugin';
import TrailingParagraphPlugin from '../../plugins/TrailingParagraphPlugin';
import SlashMenuPlugin from '../../plugins/SlashMenuPlugin';
import FloatingLinkEditorPlugin from '../../plugins/FloatingLinkEditorPlugin';
import FindReplacePlugin from '../../plugins/FindReplacePlugin';
import DraggableBlockPlugin from '../../plugins/DraggableBlockPlugin';
import ItemMentionPlugin from '../../plugins/ItemMentionPlugin';
import ExtractSelectionPlugin, { type ExtractionActions } from '../../plugins/ExtractSelectionPlugin';
import WikiLinkPlugin from '../../plugins/WikiLinkPlugin';
import ItemLinkClickPlugin from '../../plugins/ItemLinkClickPlugin';
import { editorConfig, placeholder } from '../../lexical-config';
import { ImageNode } from '@/app/editor/nodes/ImageNode';
import { restoreItemHistory, saveItemSession, type ItemEditorSession } from '@/app/editor/item-editor-session';
import { useVirtualNotes } from '@/app/editor/[projectId]/hooks/useVirtualNotes';
import { ConnectionsPanel } from '@/components/editor/connections-panel';
import { TrailConnector } from '@/components/editor/trail-connector';
import { NextTrailButton } from '@/components/editor/next-trail-button';
import type { ReorderNotice } from '../hooks/useProjectEditorState';
import { Trail, Item, TitleAlign } from '../../types';
import type { MapPreviews } from '@/lib/projects-store';

interface WriteViewProps {
  draft?: boolean;
  onDraftTitleChange?: (id: string, title: string) => void;
  resolveProjectId?: () => Promise<string | undefined>;
  active?: boolean;
  projectId: string;
  item: Item;
  items: Record<string, Item>;
  mapPreviews: MapPreviews | null | undefined;
  onRetryMapPreviews: () => void;
  trails: Trail[];
  graphColors?: string | null;
  activeTrailId: string | undefined;
  trail: Trail | undefined;
  reorderNotice?: ReorderNotice;
  onDismissReorderNotice: () => void;
  contentLoadError: boolean;
  onRetryContent: () => void;
  navigationRequest?: { itemId: string; sequence: number; focus: boolean };
  onVisibleItem: (itemId: string) => void;
  onSelectTrail: (trailId: string) => void;
  onCommitTitle: (itemId: string, currentTitle: string, nextValue: string) => void;
  onSetTitleAlign: (itemId: string, titleAlign: TitleAlign) => void;
  onSelectItem: (item: Item, trailId?: string) => void;
  onCreateItem: (trailId: string, title: string) => void;
  onOpenGraph: () => void;
  onChange: (itemId: string, editorState: EditorState, pendingCommand?: boolean) => void;
  extractionActions: ExtractionActions;
  connectionsPanelOpen: boolean;
  onToggleConnectionsPanelOpen: () => void;
}

function focusEditor(editor: LexicalEditor, edge: 'start' | 'end' = 'start') {
  editor.getRootElement()?.focus({ preventScroll: true });
  editor.update(() => {
    const root = $getRoot();
    if (edge === 'start') root.selectStart();
    else root.selectEnd();
  }, { discrete: true });
}

function focusTitle(editor: LexicalEditor) {
  const title = editor.getRootElement()?.closest('.trail-item-editor')?.querySelector<HTMLInputElement>('[data-note-title]');
  if (!title) return;
  title.focus({ preventScroll: true });
  title.setSelectionRange(0, 0);
  title.scrollIntoView({ block: 'nearest' });
}

function isOnBoundaryLine(editor: LexicalEditor, direction: -1 | 1): boolean | null {
  const root = editor.getRootElement();
  const selection = window.getSelection();
  if (!root || !selection?.isCollapsed || !selection.rangeCount || !root.contains(selection.anchorNode)) return null;
  const caret = selection.getRangeAt(0).cloneRange();
  let rect = caret.getBoundingClientRect();
  if (!rect.height && caret.startContainer.nodeType === Node.TEXT_NODE) {
    const length = caret.startContainer.textContent?.length ?? 0;
    const offset = caret.startOffset;
    if (offset < length) caret.setEnd(caret.startContainer, offset + 1);
    else if (offset > 0) caret.setStart(caret.startContainer, offset - 1);
    rect = caret.getBoundingClientRect();
  }
  if (!rect.height) {
    const container = caret.startContainer;
    const element = container.nodeType === Node.ELEMENT_NODE ? container as Element : container.parentElement;
    if (!element || element === root || element.textContent) return null;
    rect = element.getBoundingClientRect();
  }
  if (!rect.height) return null;
  const contents = document.createRange();
  const block = direction === -1 ? root.firstElementChild : root.lastElementChild;
  if (!block) return null;
  contents.selectNodeContents(block);
  const lines = Array.from(contents.getClientRects()).filter(line => line.height > 0);
  if (!lines.length) return null;
  return lines.every(line => direction === -1
    ? rect.top - line.top < rect.height / 2
    : line.bottom - rect.bottom < rect.height / 2);
}

function ItemNavigationPlugin({ itemId, register, move }: {
  itemId: string;
  register: (itemId: string, editor: LexicalEditor | null) => void;
  move: (itemId: string, direction: -1 | 1, title?: boolean) => boolean;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    register(itemId, editor);
    return () => register(itemId, null);
  }, [editor, itemId, register]);
  useEffect(() => {
    const navigate = (event: KeyboardEvent, direction: -1 | 1) => {
      if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || event.isComposing || editor.isComposing()) return false;
      const target = event.target as HTMLElement | null;
      if (target?.closest('table, pre, [role="dialog"], [role="menu"], [data-lexical-decorator="true"]')) return false;
      if (document.querySelector('.item-mention-menu, [role="dialog"], [role="menu"], [role="listbox"]:not(:empty)')) return false;
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
      const root = $getRoot();
      const boundary = direction === -1 ? root.getFirstDescendant() : root.getLastDescendant();
      const node = selection.anchor.getNode();
      const block = node.getTopLevelElement();
      if (!block || ['table', 'code', 'image', 'equation', 'music', 'embed'].includes(block.getType())) return false;
      if (!block.is(direction === -1 ? root.getFirstChild() : root.getLastChild())) return false;
      const offset = direction === -1 ? 0 : node.getTextContentSize();
      const atBoundary = root.getTextContentSize() === 0 || (boundary?.is(node) && selection.anchor.offset === offset);
      if (!(isOnBoundaryLine(editor, direction) ?? atBoundary)) return false;
      if (direction === -1) requestAnimationFrame(() => focusTitle(editor));
      else if (!move(itemId, direction, true)) return false;
      event.preventDefault();
      return true;
    };
    return mergeRegister(
      editor.registerCommand(KEY_ARROW_UP_COMMAND, (event) => navigate(event, -1), COMMAND_PRIORITY_HIGH),
      editor.registerCommand(KEY_ARROW_DOWN_COMMAND, (event) => navigate(event, 1), COMMAND_PRIORITY_HIGH),
    );
  }, [editor, itemId, move]);
  return null;
}

interface ItemEditorProps {
  item: Item;
  props: WriteViewProps;
  focused: boolean;
  toolbar: HTMLDivElement | null;
  onFocus: (itemId: string) => void;
  register: (itemId: string, editor: LexicalEditor | null) => void;
  move: (itemId: string, direction: -1 | 1, title?: boolean) => boolean;
  session: ItemEditorSession;
  onPendingImages: (itemId: string, pending: boolean) => void;
}

function ItemEditor(props: ItemEditorProps) {
  const [initialContent] = useState(() => props.session.state?.clone(null) ?? props.item.content);
  return <LexicalComposer initialConfig={{ ...editorConfig, editorState: initialContent || undefined }}>
    <ItemEditorContent {...props} />
  </LexicalComposer>;
}

function ItemEditorContent({ item, props, focused, toolbar, onFocus, register, move, session, onPendingImages }: ItemEditorProps) {
  const [editor] = useLexicalComposerContext();
  const [titleFocused, setTitleFocused] = useState(false);
  const matchSlash = useBasicTypeaheadTriggerMatch('/', { minLength: 0 });
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const [history] = useState(() => restoreItemHistory(session, editor));
  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      session.state = editorState;
      onPendingImages(item.editorKey ?? item.id, editorState.read(() => $nodesOfType(ImageNode).some(node => !node.__imageId)));
    });
    return () => { unregister(); saveItemSession(session, editor, history); };
  }, [editor, history, item.id, item.editorKey, session, onPendingImages]);
  return (
      <div className="trail-item-editor" data-item-id={item.id} ref={setAnchor} onFocusCapture={event => {
        if (event.currentTarget.contains(event.target)) onFocus(item.id);
      }}>
        <ItemTitle item={item} onDraftTitleChange={props.onDraftTitleChange} move={move} onCommitTitle={props.onCommitTitle} onFocus={() => {
          setTitleFocused(true);
          onFocus(item.id);
        }} />
        {props.trails.filter(trail => trail.itemIds.includes(item.id)).length > 1 && <div className="pl-7 py-2 text-xs text-muted-foreground">
          <p>Used in {props.trails.filter(trail => trail.itemIds.includes(item.id)).length} trails. Edits appear in {props.trails.filter(trail => trail.itemIds.includes(item.id)).length === 2 ? 'both' : 'all of them'}.</p>
          <div className="mt-1 flex flex-wrap gap-3">{props.trails.filter(trail => trail.itemIds.includes(item.id)).map(trail => <button type="button" key={trail.id} onClick={() => props.onSelectItem(item, trail.id)} className="underline">{trail.title}</button>)}</div>
        </div>}
        <div className="relative">
          <RichTextPlugin contentEditable={
            <ContentEditable className="editor-input" aria-label={`Content of ${item.title || 'Untitled note'}`} aria-placeholder={placeholder}
              onFocus={() => { setTitleFocused(false); onFocus(item.id); }}
              placeholder={<div className="editor-placeholder">{placeholder}</div>} />
          } ErrorBoundary={LexicalErrorBoundary} />
        </div>
        <HistoryPlugin externalHistoryState={history} />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <ItemLinkClickPlugin items={props.items} onNavigate={(id) => { const target = props.items[id]; if (target) props.onSelectItem(target); }} />
        <ClickableLinkPlugin newTab />
        <ImagesPlugin projectId={props.projectId} resolveProjectId={props.resolveProjectId} previewUrls={session.previewUrls} />
        <EquationsPlugin />
        <MusicPlugin />
        <EmbedsPlugin />
        <TablePlugin hasHorizontalScroll />
        <CodeBlockGuardPlugin />
        <PastePlugin />
        <CodeHighlightPlugin />
        <CodeLanguagePlugin />
        <TrailingParagraphPlugin />
        <ListTabPlugin />
        <TabIndentationPlugin />
        <HorizontalRulePlugin />
        <SlashMenuPlugin projectId={props.projectId} resolveProjectId={props.resolveProjectId}
          onClose={() => {
            if (props.draft) requestAnimationFrame(() => props.onChange(item.id, editor.getEditorState(), false));
          }} />
        <ItemMentionPlugin items={props.items} currentItemId={item.id} />
        <WikiLinkPlugin items={props.items} currentItemId={item.id} />
        <MarkdownShortcutPlugin transformers={EDITOR_TRANSFORMERS} />
        <ItemNavigationPlugin itemId={item.id} register={register} move={move} />
        <OnChangePlugin onChange={(state, editor, tags) => {
          if (tags.has('extraction')) return;
          const pendingCommand = !!props.draft && state.read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
            const node = selection.anchor.getNode();
            return $isTextNode(node) && matchSlash(node.getTextContent().slice(0, selection.anchor.offset), editor) !== null;
          });
          props.onChange(item.id, state, pendingCommand);
        }} ignoreSelectionChange ignoreHistoryMergeTagChange={false} />
        {focused && props.active !== false && <>
          {!props.draft && <ExtractSelectionPlugin projectId={props.projectId} itemId={item.id} trail={props.trail} history={history}
            sharedCount={props.trails.filter(trail => trail.itemIds.includes(item.id)).length} actions={props.extractionActions}
            onOpen={result => props.onSelectItem(result.item, result.trailId)} />}
          {toolbar && createPortal(<ToolbarPlugin projectId={props.projectId} resolveProjectId={props.resolveProjectId}
            history={history}
            titleFocused={titleFocused} titleAlign={item.titleAlign}
            onSetTitleAlign={(align) => props.onSetTitleAlign(item.id, align)} />, toolbar)}
          <FloatingLinkEditorPlugin />
          <FindReplacePlugin />
          {anchor && <DraggableBlockPlugin anchorElem={anchor} />}
        </>}
      </div>
  );
}

function ItemTitle({ item, onCommitTitle, onFocus, move, onDraftTitleChange }: {
  onDraftTitleChange?: (id: string, title: string) => void;
  item: Item;
  onCommitTitle: WriteViewProps['onCommitTitle'];
  onFocus: () => void;
  move: (itemId: string, direction: -1 | 1) => boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = inputRef.current;
    if (input && input !== document.activeElement) input.value = item.title;
  }, [item.title]);
  return <div className="pl-7 pt-2">
    <input ref={inputRef} data-note-title defaultValue={item.title} aria-label="Note title" onFocus={(event) => {
      event.currentTarget.select();
      onFocus();
    }}
      onChange={event => onDraftTitleChange?.(item.id, event.target.value)}
      maxLength={255}
      onBlur={(event) => onCommitTitle(item.id, item.title, event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || event.nativeEvent.isComposing || editor.isComposing()) return;
          if (event.currentTarget.selectionStart !== event.currentTarget.selectionEnd) return;
          if (document.querySelector('[role="dialog"], [role="menu"], [role="listbox"]:not(:empty)')) return;
          if (event.key === 'ArrowUp') {
            if (move(item.id, -1)) event.preventDefault();
            return;
          }
          event.preventDefault();
          requestAnimationFrame(() => focusEditor(editor));
          return;
        }
        if (event.key !== 'Enter' || event.metaKey || event.ctrlKey || event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.currentTarget.blur();
        focusEditor(editor);
      }} placeholder="Untitled note" style={{ textAlign: item.titleAlign }}
      title={item.title}
      className="w-full min-w-0 truncate border-0 bg-transparent font-display text-[1.75rem] font-medium leading-normal text-foreground outline-none placeholder:text-muted-foreground/40" />
  </div>;
}

export function WriteView(props: WriteViewProps) {
  const { item, items, trail, navigationRequest, onVisibleItem, active = true } = props;
  const [imageError, setImageError] = useState<string | null>(null);
  useEffect(() => {
    const onError = (event: Event) => setImageError((event as CustomEvent<string>).detail);
    window.addEventListener('editor-image-error', onError);
    return () => window.removeEventListener('editor-image-error', onError);
  }, []);
  const [focusedItemId, setFocusedItemId] = useState(item.id);
  const [positionedContext, setPositionedContext] = useState<string | null>(null);
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  const editorInnerRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef(new Map<string, HTMLElement>());
  const editors = useRef(new Map<string, LexicalEditor>());
  const [sessions] = useState(() => new Map<string, ItemEditorSession>());
  const [busyItems, setBusyItems] = useState<Set<string>>(() => new Set());
  const [pendingMove, setPendingMove] = useState<{ itemId: string; direction: -1 | 1; title: boolean; context: string; sequence?: number } | null>(null);
  const handledRequest = useRef<number | null>(null);
  const inTrail = !!trail?.itemIds.includes(item.id);
  const nextTrail = inTrail && trail ? props.trails[props.trails.findIndex(candidate => candidate.id === trail.id) + 1] : undefined;
  const steps = inTrail && trail ? trail.steps : [{ itemId: item.id }];
  const ids = useMemo(() => inTrail && trail ? trail.itemIds : [item.id], [inTrail, trail, item.id]);
  const focusedId = ids.includes(focusedItemId) ? focusedItemId : item.id;
  const contentReady = ids.every((id) => items[id]?.content != null);
  const context = inTrail ? `trail:${trail!.editorKey ?? trail!.id}` : `item:${item.editorKey ?? item.id}`;
  const revealed = contentReady && positionedContext === context;
  const { visibleIds, selectionIds, heights } = useVirtualNotes(editorInnerRef, slotRefs, ids, active && contentReady);
  const moveTarget = pendingMove?.context === context && pendingMove.sequence === navigationRequest?.sequence ? pendingMove : null;
  useEffect(() => () => {
    for (const session of sessions.values()) session.previewUrls.forEach(url => URL.revokeObjectURL(url));
  }, [sessions]);
  useEffect(() => {
    const editorKeys = new Set(Object.values(items).map(item => item.editorKey ?? item.id));
    for (const [id, session] of sessions) {
      if (editorKeys.has(id)) continue;
      session.previewUrls.forEach(url => URL.revokeObjectURL(url));
      sessions.delete(id);
    }
  }, [items, sessions]);
  useScrollSpy({ root: editorInnerRef, slots: slotRefs, ids, enabled: active && revealed, onVisible: (id) => {
    if (!navigationRequest || handledRequest.current === navigationRequest.sequence) onVisibleItem(id);
  } });

  const onFocus = useCallback((itemId: string) => {
    setFocusedItemId(itemId);
    onVisibleItem(itemId);
  }, [onVisibleItem]);
  const onPendingImages = useCallback((id: string, pending: boolean) => {
    setBusyItems(previous => {
      if (previous.has(id) === pending) return previous;
      const next = new Set(previous);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  const register = useCallback((id: string, editor: LexicalEditor | null) => {
    if (editor) editors.current.set(id, editor);
    else editors.current.delete(id);
  }, []);
  const move = useCallback((id: string, direction: -1 | 1, title = false) => {
    const next = ids[ids.indexOf(id) + direction];
    if (!next || items[next]?.content == null) return false;
    setPendingMove({ itemId: next, direction, title, context, sequence: navigationRequest?.sequence });
    return true;
  }, [ids, items, context, navigationRequest?.sequence]);
  useEffect(() => {
    if (!active || !moveTarget) return;
    const frame = requestAnimationFrame(() => {
      const editor = editors.current.get(moveTarget.itemId);
      if (!editor) return;
      slotRefs.current.get(moveTarget.itemId)?.scrollIntoView({ block: 'nearest' });
      if (moveTarget.title) focusTitle(editor);
      else focusEditor(editor, moveTarget.direction === -1 ? 'end' : 'start');
      setPendingMove(previous => previous === moveTarget ? null : previous);
    });
    return () => cancelAnimationFrame(frame);
  }, [active, moveTarget, visibleIds]);

  useEffect(() => {
    const request = navigationRequest;
    if (!active || !contentReady || (positionedContext === context && (!request || handledRequest.current === request.sequence))) return;
    const frame = requestAnimationFrame(() => {
      const targetId = request?.itemId ?? item.id;
      const editor = editors.current.get(targetId);
      if (!editor) return;
      handledRequest.current = request?.sequence ?? null;
      slotRefs.current.get(targetId)?.scrollIntoView({ block: 'start' });
      setFocusedItemId(targetId);
      onVisibleItem(targetId);
      setPositionedContext(context);
      if (request?.focus) requestAnimationFrame(() => focusEditor(editor));
    });
    return () => cancelAnimationFrame(frame);
  }, [active, navigationRequest, contentReady, onVisibleItem, positionedContext, context, item.id, visibleIds]);

  useEffect(() => {
    if (!active || props.draft) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[role="dialog"], [role="menu"], [role="listbox"], .find-replace-bar')) return;
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && inTrail && trail
          && target?.closest('.trail-item-editor')) {
        event.preventDefault();
        props.onCreateItem(trail.id, 'Untitled');
      }
      if (!event.altKey || (!event.metaKey && !event.ctrlKey) || event.shiftKey) return;
      if (target?.closest('input, textarea, [contenteditable="true"]') && !target.closest('.trail-item-editor')) return;
      const origin = target?.closest<HTMLElement>('[data-item-id]')?.dataset.itemId ?? item.id;
      if (event.key === 'ArrowRight' && nextTrail && origin === ids[ids.length - 1] && !event.isComposing) {
        event.preventDefault();
        props.onSelectTrail(nextTrail.id);
        return;
      }
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      move(origin, event.key === 'ArrowUp' ? -1 : 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return <EditorImagesProvider projectId={props.projectId} publicRead={false}>
    {imageError && <div role="alert" className="text-sm text-destructive">{imageError}<button type="button" onClick={() => setImageError(null)}>Dismiss</button></div>}
    <div data-tour="write-panel" className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="editor-container relative flex flex-1 min-h-0 flex-col" aria-busy={!revealed}>
        {!revealed && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground" role="status">
          {props.contentLoadError ? <><p>Could not load the editor.</p><button type="button" className="text-foreground underline" onClick={props.onRetryContent}>Retry</button></> : <><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />Loading editor…</>}
        </div>}
        <div ref={setToolbar} data-editor-toolbar className="min-h-[52px]" style={{ visibility: revealed ? undefined : 'hidden' }} />
        {props.reorderNotice && props.reorderNotice.error && <div
          role={props.reorderNotice.error ? 'alert' : 'status'} className="mx-4 my-2 max-h-36 shrink-0 overflow-y-auto rounded-lg border border-border bg-muted p-3 text-sm">
          {props.reorderNotice.error && <p className="text-destructive">{props.reorderNotice.error}</p>}
          <button type="button" className="mt-2 text-muted-foreground underline" onClick={props.onDismissReorderNotice}>Dismiss</button>
        </div>}
        <div className="editor-inner" ref={editorInnerRef} style={{ visibility: revealed ? undefined : 'hidden' }} inert={!revealed}>
          <div className="editor-content-column">
            {steps.map((step, index) => {
              const stepItem = items[step.itemId];
              if (!stepItem) return null;
              const editorKey = stepItem.editorKey ?? stepItem.id;
              const mounted = visibleIds.has(stepItem.id) || selectionIds.has(stepItem.id) || stepItem.id === item.id || stepItem.id === focusedId || stepItem.id === moveTarget?.itemId || busyItems.has(editorKey);
              let session = sessions.get(editorKey);
              if (!session) {
                session = { undo: [], redo: [], previewUrls: new Set() };
                sessions.set(editorKey, session);
              }
              return <section key={editorKey} data-item-id={step.itemId} data-mounted={mounted} aria-label={`Step ${index + 1}: ${stepItem.title}`}
                style={mounted ? undefined : { height: heights.get(stepItem.id) ?? 240, overflow: 'hidden' }}
                ref={(element) => { if (element) slotRefs.current.set(step.itemId, element); else slotRefs.current.delete(step.itemId); }}>
                {index > 0 && trail && <div className="trail-divider mt-4">
                  <TrailConnector />
                </div>}
                <div className={`pl-7 pt-6 text-[0.6875rem] font-medium uppercase tracking-[0.1em] ${item.id === stepItem.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Step {index + 1}
                </div>
                {stepItem.content != null && (mounted ? <ItemEditor item={stepItem} props={props} focused={focusedId === stepItem.id}
                  toolbar={toolbar} onFocus={onFocus} register={register} move={move} session={session} onPendingImages={onPendingImages} /> : <button type="button"
                  aria-label={`Open note: ${stepItem.title}`} onClick={() => props.onSelectItem(stepItem, props.activeTrailId)}
                  className="w-full pl-7 pt-2 text-left font-display text-[1.75rem] font-medium" style={{ textAlign: stepItem.titleAlign }}>
                  {stepItem.title}
                </button>)}
                {index === steps.length - 1 && nextTrail && <NextTrailButton trail={nextTrail} onSelectTrail={props.onSelectTrail}>
                  <kbd className="text-xs text-muted-foreground">⌘⌥→</kbd>
                </NextTrailButton>}
              </section>;
            })}
            {inTrail && trail && <div className="mt-16 flex justify-center pb-4">
              <button type="button" disabled={props.draft} onClick={() => props.onCreateItem(trail.id, 'Untitled')}
                className="flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Add next step <kbd>⌘↵</kbd>
              </button>
            </div>}
          </div>
        </div>
      </div>
    </div>
    {!props.draft && <ConnectionsPanel item={items[focusedId]} items={items} trails={props.trails} mapPreviews={props.mapPreviews} onRetryMapPreviews={props.onRetryMapPreviews} graphColors={props.graphColors} activeTrailId={props.activeTrailId}
      onSelectItem={props.onSelectItem} onOpenGraph={props.onOpenGraph}
      open={props.connectionsPanelOpen} onToggleOpen={props.onToggleConnectionsPanelOpen} />}
  </EditorImagesProvider>;
}
