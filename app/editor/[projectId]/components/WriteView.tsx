import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import type { EditorState } from 'lexical';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $getSelection, $isRangeSelection, COMMAND_PRIORITY_HIGH, KEY_ARROW_UP_COMMAND, KEY_ARROW_DOWN_COMMAND, type LexicalEditor } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { useScrollSpy } from '@/hooks/use-scroll-spy';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin, createEmptyHistoryState } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { EDITOR_TRANSFORMERS } from '../../plugins/markdownTransformers';

import ToolbarPlugin from '../../plugins/ToolbarPlugin';
import { EditorImagesProvider } from '@/components/editor/editor-images-provider';
import ImagesPlugin from '../../plugins/ImagesPlugin';
import EquationsPlugin from '../../plugins/EquationsPlugin';
import MusicPlugin from '../../plugins/MusicPlugin';
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
import WikiLinkPlugin from '../../plugins/WikiLinkPlugin';
import ItemLinkClickPlugin from '../../plugins/ItemLinkClickPlugin';
import { editorConfig, placeholder } from '../../lexical-config';
import { ConnectionsPanel } from '@/components/editor/connections-panel';
import { TrailConnector } from '@/components/editor/trail-connector';
import { bridgeTies } from '../../associations';
import { Trail, Item, TitleAlign, Association, AssociationType, AssociationTargetType } from '../../types';

interface WriteViewProps {
  projectId: string;
  item: Item;
  items: Record<string, Item>;
  trails: Trail[];
  activeTrailId: string | undefined;
  trail: Trail | undefined;
  associationById: Map<string, Association>;
  contentLoadError: boolean;
  onRetryContent: () => void;
  navigationRequest?: { itemId: string; sequence: number; focus: boolean };
  onVisibleItem: (itemId: string) => void;
  onSelectTrail: (trailId: string) => void;
  onUpdateAnnotation: (trailId: string, itemId: string, annotation: string) => void;
  onCommitTitle: (itemId: string, currentTitle: string, nextValue: string) => void;
  onSetTitleAlign: (itemId: string, titleAlign: TitleAlign) => void;
  onSelectItem: (item: Item, trailId?: string) => void;
  onCreateItem: (trailId: string, title: string) => void;
  onTie: (itemId: string, targetId: string, targetType: AssociationTargetType, type: AssociationType) => void;
  onUntie: (itemId: string, targetId: string, targetType: AssociationTargetType) => void;
  onOpenGraph: () => void;
  onChange: (itemId: string, editorState: EditorState) => void;
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

function ItemNavigationPlugin({ itemId, register, move }: {
  itemId: string;
  register: (itemId: string, editor: LexicalEditor | null) => void;
  move: (itemId: string, direction: -1 | 1) => boolean;
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
      if (document.querySelector('.item-mention-menu, [role="dialog"], [role="menu"]')) return false;
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
      const root = $getRoot();
      const boundary = direction === -1 ? root.getFirstDescendant() : root.getLastDescendant();
      const node = selection.anchor.getNode();
      if (['table', 'code', 'image', 'equation', 'music'].includes(node.getTopLevelElement()?.getType() ?? '')) return false;
      const offset = direction === -1 ? 0 : node.getTextContentSize();
      const atBoundary = root.getTextContentSize() === 0 || (boundary?.is(node) && selection.anchor.offset === offset);
      if (!atBoundary || !move(itemId, direction)) return false;
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

function ItemEditor({ item, props, focused, toolbar, onFocus, register, move }: {
  item: Item;
  props: WriteViewProps;
  focused: boolean;
  toolbar: HTMLDivElement | null;
  onFocus: (itemId: string) => void;
  register: (itemId: string, editor: LexicalEditor | null) => void;
  move: (itemId: string, direction: -1 | 1) => boolean;
}) {
  const [titleFocused, setTitleFocused] = useState(false);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const [initialContent] = useState(item.content);
  const [history] = useState(createEmptyHistoryState);
  return (
    <LexicalComposer initialConfig={{ ...editorConfig, editorState: initialContent || undefined }}>
      <div className="trail-item-editor" data-item-id={item.id} ref={setAnchor}>
        <ItemTitle item={item} onCommitTitle={props.onCommitTitle} onFocus={() => {
          setTitleFocused(true);
          onFocus(item.id);
        }} />
        {props.trails.filter(trail => trail.itemIds.includes(item.id)).length > 1 && <div className="pl-7 py-2 text-xs text-muted-foreground">
          <p>Used in {props.trails.filter(trail => trail.itemIds.includes(item.id)).length} trails. Edits appear in {props.trails.filter(trail => trail.itemIds.includes(item.id)).length === 2 ? 'both' : 'all of them'}.</p>
          <div className="mt-1 flex flex-wrap gap-3">{props.trails.filter(trail => trail.itemIds.includes(item.id)).map(trail => <button type="button" key={trail.id} onClick={() => props.onSelectItem(item, trail.id)} className="underline">{trail.title}</button>)}</div>
        </div>}
        <div className="relative">
          <RichTextPlugin contentEditable={
            <ContentEditable className="editor-input" aria-label={`Content of ${item.title}`} aria-placeholder={placeholder}
              onFocus={() => { setTitleFocused(false); onFocus(item.id); }}
              placeholder={<div className="editor-placeholder">{placeholder}</div>} />
          } ErrorBoundary={LexicalErrorBoundary} />
        </div>
        <HistoryPlugin externalHistoryState={history} />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <ItemLinkClickPlugin onNavigate={(id) => { const target = props.items[id]; if (target) props.onSelectItem(target); }} />
        <ClickableLinkPlugin newTab />
        <ImagesPlugin projectId={props.projectId} />
        <EquationsPlugin />
        <MusicPlugin />
        <TablePlugin hasHorizontalScroll />
        <CodeBlockGuardPlugin />
        <PastePlugin />
        <CodeHighlightPlugin />
        <CodeLanguagePlugin />
        <TrailingParagraphPlugin />
        <ListTabPlugin />
        <TabIndentationPlugin />
        <HorizontalRulePlugin />
        <SlashMenuPlugin projectId={props.projectId} />
        <ItemMentionPlugin items={props.items} currentItemId={item.id} />
        <WikiLinkPlugin items={props.items} currentItemId={item.id} />
        <MarkdownShortcutPlugin transformers={EDITOR_TRANSFORMERS} />
        <ItemNavigationPlugin itemId={item.id} register={register} move={move} />
        <OnChangePlugin onChange={(state) => props.onChange(item.id, state)} ignoreSelectionChange />
        {focused && <>
          {toolbar && createPortal(<ToolbarPlugin projectId={props.projectId}
            history={history}
            titleFocused={titleFocused} titleAlign={item.titleAlign}
            onSetTitleAlign={(align) => props.onSetTitleAlign(item.id, align)} />, toolbar)}
          <FloatingLinkEditorPlugin />
          <FindReplacePlugin />
          {anchor && <DraggableBlockPlugin anchorElem={anchor} />}
        </>}
      </div>
    </LexicalComposer>
  );
}

function ItemTitle({ item, onCommitTitle, onFocus }: {
  item: Item;
  onCommitTitle: WriteViewProps['onCommitTitle'];
  onFocus: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = inputRef.current;
    if (input && input !== document.activeElement) input.value = item.title;
  }, [item.title]);
  return <div className="pl-7 pt-2">
    <input ref={inputRef} defaultValue={item.title} aria-label="Note title" onFocus={onFocus}
      onBlur={(event) => onCommitTitle(item.id, item.title, event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || event.metaKey || event.ctrlKey || event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.currentTarget.blur();
        requestAnimationFrame(() => focusEditor(editor));
      }} placeholder="Untitled" style={{ textAlign: item.titleAlign }}
      className="w-full border-0 bg-transparent font-display text-[28px] font-medium text-foreground outline-none placeholder:text-muted-foreground/40" />
  </div>;
}

export function WriteView(props: WriteViewProps) {
  const { item, items, trail, associationById, navigationRequest, onVisibleItem } = props;
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
  const handledRequest = useRef<number | null>(null);
  const inTrail = !!trail?.itemIds.includes(item.id);
  const nextTrail = inTrail && trail ? props.trails[props.trails.findIndex(candidate => candidate.id === trail.id) + 1] : undefined;
  const steps = inTrail && trail ? trail.steps : [{ itemId: item.id, annotation: null, associationId: null }];
  const ids = useMemo(() => inTrail && trail ? trail.itemIds : [item.id], [inTrail, trail, item.id]);
  const focusedId = ids.includes(focusedItemId) ? focusedItemId : item.id;
  const contentReady = ids.every((id) => items[id]?.content != null);
  const context = inTrail ? `trail:${trail!.id}` : `item:${item.id}`;
  const revealed = contentReady && positionedContext === context;
  useScrollSpy({ root: editorInnerRef, slots: slotRefs, ids, enabled: revealed, onVisible: (id) => {
    if (!navigationRequest || handledRequest.current === navigationRequest.sequence) onVisibleItem(id);
  } });

  const onFocus = useCallback((itemId: string) => {
    setFocusedItemId(itemId);
    onVisibleItem(itemId);
  }, [onVisibleItem]);
  const register = useCallback((id: string, editor: LexicalEditor | null) => {
    if (editor) editors.current.set(id, editor);
    else editors.current.delete(id);
  }, []);
  const move = useCallback((id: string, direction: -1 | 1) => {
    const next = ids[ids.indexOf(id) + direction];
    const editor = next && editors.current.get(next);
    if (!editor) return false;
    requestAnimationFrame(() => {
      slotRefs.current.get(next)?.scrollIntoView({ block: 'nearest' });
      focusEditor(editor, direction === -1 ? 'end' : 'start');
    });
    return true;
  }, [ids]);

  useEffect(() => {
    const request = navigationRequest;
    if (!contentReady || (positionedContext === context && (!request || handledRequest.current === request.sequence))) return;
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
  }, [navigationRequest, contentReady, onVisibleItem, positionedContext, context, item.id]);

  useEffect(() => {
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
          {props.contentLoadError ? <><p>Could not load the editor.</p><button type="button" className="text-foreground underline" onClick={props.onRetryContent}>Retry</button></> : 'Loading editor…'}
        </div>}
        <div ref={setToolbar} data-editor-toolbar className="min-h-[52px]" style={{ visibility: revealed ? undefined : 'hidden' }} />
        <hr />
        <div className="editor-inner" ref={editorInnerRef} style={{ visibility: revealed ? undefined : 'hidden' }} inert={!revealed}>
          <div className="editor-content-column">
            {steps.map((step, index) => {
              const stepItem = items[step.itemId];
              if (!stepItem) return null;
              const ties = index > 0 && trail ? bridgeTies(items, trail.steps[index - 1].itemId, step.itemId) : [];
              const explicit = step.associationId ? associationById.get(step.associationId) : undefined;
              if (explicit && !ties.some((tie) => tie.association.id === explicit.id)) ties.unshift({ association: explicit, forward: true, sourceTitle: Object.values(items).find(note => note.associations.some(a => a.id === explicit.id))?.title });
              return <section key={step.itemId} aria-label={`Step ${index + 1}: ${stepItem.title}`}
                ref={(element) => { if (element) slotRefs.current.set(step.itemId, element); else slotRefs.current.delete(step.itemId); }}>
                {index > 0 && trail && <div className="trail-divider mt-4">
                  <TrailConnector ties={ties} annotation={step.annotation}
                    onSaveAnnotation={(text) => props.onUpdateAnnotation(trail.id, step.itemId, text)} />
                </div>}
                <div className={`pl-7 pt-6 text-[11px] font-medium uppercase tracking-[0.1em] ${item.id === stepItem.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Step {index + 1}
                </div>
                {stepItem.content != null && <ItemEditor item={stepItem} props={props} focused={focusedId === stepItem.id}
                  toolbar={toolbar} onFocus={onFocus} register={register} move={move} />}
                {index === steps.length - 1 && nextTrail && <div className="mt-8 flex justify-end pl-7">
                  <button type="button" onClick={() => props.onSelectTrail(nextTrail.id)}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
                    Next trail: {nextTrail.title} <kbd className="text-xs text-muted-foreground">⌘⌥→</kbd>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>}
              </section>;
            })}
            {inTrail && trail && <div className="mt-16 flex justify-center pb-4">
              <button type="button" onClick={() => props.onCreateItem(trail.id, 'Untitled')}
                className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground">
                <Plus className="h-3.5 w-3.5" /> Add next step <kbd>⌘↵</kbd>
              </button>
            </div>}
          </div>
        </div>
      </div>
    </div>
    <ConnectionsPanel key={focusedId} item={items[focusedId]} items={items} trails={props.trails} activeTrailId={props.activeTrailId}
      onSelectItem={props.onSelectItem} onSelectTrail={props.onSelectTrail} onTie={props.onTie} onUntie={props.onUntie} onOpenGraph={props.onOpenGraph}
      open={props.connectionsPanelOpen} onToggleOpen={props.onToggleConnectionsPanelOpen} />
  </EditorImagesProvider>;
}
