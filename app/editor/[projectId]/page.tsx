
"use client"
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
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
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { EDITOR_TRANSFORMERS } from '../plugins/markdownTransformers';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';

import {
  $isTextNode,
  DOMConversionMap,
  DOMExportOutput,
  DOMExportOutputMap,
  isHTMLElement,
  Klass,
  LexicalEditor,
  LexicalNode,
  ParagraphNode,
  TextNode,
  EditorState,
} from 'lexical';

import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';

import ExampleTheme from '../ExampleTheme';
import ToolbarPlugin from '../plugins/ToolbarPlugin';
import UpdateContentPlugin from '../plugins/UpdateContentPlugin';
import ImagesPlugin from '../plugins/ImagesPlugin';
import PastePlugin from '../plugins/PastePlugin';
import CodeHighlightPlugin from '../plugins/CodeHighlightPlugin';
import SlashMenuPlugin from '../plugins/SlashMenuPlugin';
import FloatingLinkEditorPlugin from '../plugins/FloatingLinkEditorPlugin';
import FindReplacePlugin from '../plugins/FindReplacePlugin';
import DraggableBlockPlugin from '../plugins/DraggableBlockPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import ItemMentionPlugin from '../plugins/ItemMentionPlugin';
import WikiLinkPlugin from '../plugins/WikiLinkPlugin';
import ItemLinkClickPlugin from '../plugins/ItemLinkClickPlugin';
import { ImageNode } from '../nodes/ImageNode';
import { parseAllowedColor, parseAllowedFontSize } from '../styleConfig';
import { ProjectShell } from '@/components/project-shell';
import { SidebarCustom } from '@/components/sidebar-custom';
import { ConnectionsPanel } from '@/components/connections-panel';
import { KnowledgeGraph } from '@/components/knowledge-graph';
import { SidebarProvider } from '@/components/ui/sidebar';
import { UserMenu } from '@/components/user-menu';
import { Input } from '@/components/ui/input';
import { AlertCircle, Check, FolderPlus, Loader2, X } from 'lucide-react';
import { Trail, Item, TitleAlign } from '../types';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getProject,
  renameProject,
  createTrail,
  renameTrail,
  deleteTrail as deleteTrailRequest,
  createItem,
  renameItem,
  setItemTitleAlign,
  attachItemToTrail,
  detachItemFromTrail,
  linkItems as linkItemsRequest,
  unlinkItems as unlinkItemsRequest,
  setProjectThumbnail,
  type ProjectVisibility,
} from '@/lib/projects-store';
import { getItemContent, saveItemContent } from '@/lib/item-content-client';
import { getMyProfile } from '@/lib/profile';
import { uploadImage } from '@/lib/upload-image';
import { ShareDialog } from '@/components/share-dialog';
import { ThumbnailCapture } from '@/components/thumbnail-capture';

const placeholder = 'Start writing...';


const removeStylesExportDOM = (
  editor: LexicalEditor,
  target: LexicalNode,
): DOMExportOutput => {
  const output = target.exportDOM(editor);
  if (output && isHTMLElement(output.element)) {
    for (const el of [
      output.element,
      ...output.element.querySelectorAll('[style],[class]'),
    ]) {
      el.removeAttribute('class');
      el.removeAttribute('style');
    }
  }
  return output;
};

const exportMap: DOMExportOutputMap = new Map<
  Klass<LexicalNode>,
  (editor: LexicalEditor, target: LexicalNode) => DOMExportOutput
>([
  [ParagraphNode, removeStylesExportDOM],
  [TextNode, removeStylesExportDOM],
]);

const getExtraStyles = (element: HTMLElement): string => {
  let extraStyles = '';
  const fontSize = parseAllowedFontSize(element.style.fontSize);
  const backgroundColor = parseAllowedColor(element.style.backgroundColor);
  const color = parseAllowedColor(element.style.color);
  if (fontSize !== '' && fontSize !== '15px') {
    extraStyles += `font-size: ${fontSize};`;
  }
  if (backgroundColor !== '' && backgroundColor !== 'rgb(255, 255, 255)') {
    extraStyles += `background-color: ${backgroundColor};`;
  }
  if (color !== '' && color !== 'rgb(0, 0, 0)') {
    extraStyles += `color: ${color};`;
  }
  return extraStyles;
};

const constructImportMap = (): DOMConversionMap => {
  const importMap: DOMConversionMap = {};

  for (const [tag, fn] of Object.entries(TextNode.importDOM() || {})) {
    importMap[tag] = (importNode) => {
      const importer = fn(importNode);
      if (!importer) {
        return null;
      }
      return {
        ...importer,
        conversion: (element) => {
          const output = importer.conversion(element);
          if (
            output === null ||
            output.forChild === undefined ||
            output.after !== undefined ||
            output.node !== null
          ) {
            return output;
          }
          const extraStyles = getExtraStyles(element);
          if (extraStyles) {
            const { forChild } = output;
            return {
              ...output,
              forChild: (child, parent) => {
                const textNode = forChild(child, parent);
                if ($isTextNode(textNode)) {
                  textNode.setStyle(textNode.getStyle() + extraStyles);
                }
                return textNode;
              },
            };
          }
          return output;
        },
      };
    };
  }

  return importMap;
};

const editorConfig = {
  html: {
    export: exportMap,
    import: constructImportMap(),
  },
  namespace: 'tramo-editor',
  nodes: [
    ParagraphNode,
    TextNode,
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    CodeNode,
    CodeHighlightNode,
    AutoLinkNode,
    LinkNode,
    ImageNode,
    HorizontalRuleNode,
  ],
  onError(error: Error) {
    console.error(error);
  },
  theme: ExampleTheme,
};

const lastItemStorageKey = (projectId: string) => `tramo:lastItem:${projectId}`;
const SIDEBAR_OPEN_STORAGE_KEY = 'tramo:editorSidebarOpen';
const CONNECTIONS_OPEN_STORAGE_KEY = 'tramo:editorConnectionsOpen';

function countTextStats(content: string): { words: number; characters: number } {
  if (!content) return { words: 0, characters: 0 };
  try {
    const parsed = JSON.parse(content);
    const texts: string[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      const record = node as { text?: unknown; children?: unknown };
      if (typeof record.text === 'string') texts.push(record.text);
      if (Array.isArray(record.children)) record.children.forEach(walk);
    };
    walk((parsed as { root?: unknown }).root);
    const characters = texts.reduce((sum, text) => sum + text.length, 0);
    const joined = texts.join(' ').trim();
    const words = joined ? joined.split(/\s+/).length : 0;
    return { words, characters };
  } catch {
    return { words: 0, characters: 0 };
  }
}

export default function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('private');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  const [trails, setTrails] = useState<Trail[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const itemsRef = useRef<Record<string, Item>>({});
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<'editor' | 'graph'>('editor');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(
    () => typeof window === 'undefined' || localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY) !== 'false'
  );
  const [connectionsPanelOpen, setConnectionsPanelOpen] = useState(
    () => typeof window === 'undefined' || localStorage.getItem(CONNECTIONS_OPEN_STORAGE_KEY) !== 'false'
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [thumbnailCapture, setThumbnailCapture] = useState<{ title: string; titleAlign: TitleAlign; content: string } | null>(null);
  const [profile, setProfile] = useState<{ username: string; imageUrl: string | null } | null>(null);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, String(leftSidebarOpen));
  }, [leftSidebarOpen]);

  useEffect(() => {
    localStorage.setItem(CONNECTIONS_OPEN_STORAGE_KEY, String(connectionsPanelOpen));
  }, [connectionsPanelOpen]);

  useEffect(() => {
    let cancelled = false;
    getMyProfile().then((p) => {
      if (!cancelled) setProfile(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getProject(projectId).then(async (project) => {
      if (cancelled) return;
      if (!project) {
        router.replace('/projects');
        return;
      }
      setProjectTitle(project.title);
      setVisibility(project.visibility);
      setDescription(project.description);
      setTags(project.tags);
      setTrails(project.trails);
      setItems(project.items);
      setLoaded(true);

      const savedItemId = localStorage.getItem(lastItemStorageKey(projectId));
      const savedItem = savedItemId ? project.items[savedItemId] : undefined;
      if (!savedItem) return;

      try {
        const content = await getItemContent(savedItem.id);
        if (cancelled) return;
        setItems(prevItems => {
          const existing = prevItems[savedItem.id];
          if (!existing) return prevItems;
          return { ...prevItems, [savedItem.id]: { ...existing, content } };
        });
      } catch (err) {
        console.error(err);
      }
      if (!cancelled) setSelectedItemId(savedItem.id);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, router]);

  useEffect(() => {
    if (!loaded) return;
    if (selectedItemId) {
      localStorage.setItem(lastItemStorageKey(projectId), selectedItemId);
    } else {
      localStorage.removeItem(lastItemStorageKey(projectId));
    }
  }, [projectId, selectedItemId, loaded]);

  const selectedItem = selectedItemId ? items[selectedItemId] : undefined;
  const textStats = useMemo(() => countTextStats(selectedItem?.content ?? ''), [selectedItem?.content]);

  const [activeAlignTarget, setActiveAlignTarget] = useState<'title' | 'body'>('body');

  const [blockAnchor, setBlockAnchor] = useState<HTMLDivElement | null>(null);
  const editorInnerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = editorInnerRef.current;
    if (!el) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.scrollTop = 0;
    }));
  }, [selectedItemId]);

  const commitItemTitle = (itemId: string, currentTitle: string, nextValue: string) => {
    const trimmed = nextValue.trim();
    if (!trimmed || trimmed === currentTitle) return;
    handleRenameItem(itemId, trimmed);
  };

  const handleSetItemTitleAlign = async (itemId: string, titleAlign: TitleAlign) => {
    setItems(prevItems => {
      const item = prevItems[itemId];
      if (!item) return prevItems;
      return { ...prevItems, [itemId]: { ...item, titleAlign } };
    });
    await setItemTitleAlign(itemId, titleAlign);
  };

  const selectItemRequestRef = useRef(0);

  const handleSelectItem = async (item: Item) => {
    setView('editor');
    const requestId = ++selectItemRequestRef.current;
    try {
      const content = await getItemContent(item.id);
      if (selectItemRequestRef.current !== requestId) return;
      setItems(prevItems => {
        const existing = prevItems[item.id];
        if (!existing) return prevItems;
        return { ...prevItems, [item.id]: { ...existing, content } };
      });
    } catch (err) {
      console.error(err);
    }
    if (selectItemRequestRef.current !== requestId) return;
    setSelectedItemId(item.id);
  };

  const handleCreateTrail = async (title: string) => {
    const newTrail = await createTrail(projectId, title);
    setTrails(prevTrails => [...prevTrails, newTrail]);
  };

  const handleCreateItem = async (trailId: string, title: string) => {
    const newItem = await createItem(trailId, title);
    setItems(prevItems => ({ ...prevItems, [newItem.id]: newItem }));
    setTrails(prevTrails => prevTrails.map(trail =>
      trail.id === trailId
        ? { ...trail, itemIds: [...trail.itemIds, newItem.id] }
        : trail
    ));
    setSelectedItemId(newItem.id);
  };

  const handleLinkItemToTrail = async (trailId: string, itemId: string) => {
    await attachItemToTrail(trailId, itemId);
    setTrails(prevTrails => prevTrails.map(trail =>
      trail.id === trailId && !trail.itemIds.includes(itemId)
        ? { ...trail, itemIds: [...trail.itemIds, itemId] }
        : trail
    ));
  };

  const handleUnlinkItemFromTrail = async (trailId: string, itemId: string) => {
    await detachItemFromTrail(trailId, itemId);
    const nextTrails = trails.map(trail =>
      trail.id === trailId
        ? { ...trail, itemIds: trail.itemIds.filter(id => id !== itemId) }
        : trail
    );
    setTrails(nextTrails);

    const stillReferenced = nextTrails.some(trail => trail.itemIds.includes(itemId));
    if (!stillReferenced) {
      setItems(prevItems => {
        const next = { ...prevItems };
        delete next[itemId];
        return next;
      });
      if (selectedItemId === itemId) {
        setSelectedItemId(undefined);
      }
    }
  };

  const handleRenameTrail = async (trailId: string, title: string) => {
    await renameTrail(trailId, title);
    setTrails(prevTrails => prevTrails.map(trail =>
      trail.id === trailId ? { ...trail, title } : trail
    ));
  };

  const handleRenameItem = async (itemId: string, title: string) => {
    await renameItem(itemId, title);
    setItems(prevItems => {
      const item = prevItems[itemId];
      if (!item) return prevItems;
      return { ...prevItems, [itemId]: { ...item, title } };
    });
  };

  const handleDeleteTrail = async (trailId: string) => {
    const target = trails.find(trail => trail.id === trailId);
    if (!target) return;

    await deleteTrailRequest(trailId);

    const remainingTrails = trails.filter(trail => trail.id !== trailId);
    const orphanIds = target.itemIds.filter(
      itemId => !remainingTrails.some(trail => trail.itemIds.includes(itemId))
    );

    setTrails(remainingTrails);
    if (orphanIds.length > 0) {
      setItems(prevItems => {
        const next = { ...prevItems };
        orphanIds.forEach(id => delete next[id]);
        return next;
      });
      if (selectedItemId && orphanIds.includes(selectedItemId)) {
        setSelectedItemId(undefined);
      }
    }
  };

  const handleLinkItems = async (itemId: string, otherItemId: string) => {
    if (itemId === otherItemId) return;
    await linkItemsRequest(itemId, otherItemId);
    setItems(prevItems => {
      const a = prevItems[itemId];
      const b = prevItems[otherItemId];
      if (!a || !b) return prevItems;
      const next = { ...prevItems };
      if (!a.linkedItemIds.includes(otherItemId)) {
        next[itemId] = { ...a, linkedItemIds: [...a.linkedItemIds, otherItemId] };
      }
      if (!b.linkedItemIds.includes(itemId)) {
        next[otherItemId] = { ...b, linkedItemIds: [...b.linkedItemIds, itemId] };
      }
      return next;
    });
  };

  const handleUnlinkItems = async (itemId: string, otherItemId: string) => {
    await unlinkItemsRequest(itemId, otherItemId);
    setItems(prevItems => {
      const a = prevItems[itemId];
      const b = prevItems[otherItemId];
      if (!a || !b) return prevItems;
      return {
        ...prevItems,
        [itemId]: { ...a, linkedItemIds: a.linkedItemIds.filter(id => id !== otherItemId) },
        [otherItemId]: { ...b, linkedItemIds: b.linkedItemIds.filter(id => id !== itemId) },
      };
    });
  };

  const firstItemIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    firstItemIdRef.current = trails.flatMap(trail => trail.itemIds)[0];
  }, [trails]);

  const handleVisibilityChange = async (next: ProjectVisibility) => {
    setVisibility(next);
    if (next !== 'published') return;

    const firstItemId = firstItemIdRef.current;
    if (!firstItemId) return;

    try {
      const content = await getItemContent(firstItemId);
      if (content) setThumbnailCapture({
        title: itemsRef.current[firstItemId]?.title ?? '',
        titleAlign: itemsRef.current[firstItemId]?.titleAlign ?? 'center',
        content,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleThumbnailCaptured = useCallback(async (blob: Blob | null) => {
    setThumbnailCapture(null);
    if (!blob) return;
    try {
      const publicUrl = await uploadImage(blob, 'thumbnail');
      await setProjectThumbnail(projectId, publicUrl);
    } catch (err) {
      console.error(err);
    }
  }, [projectId]);

  const pendingContentRef = useRef<{ itemId: string; content: string } | null>(null);
  const saveContentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastThumbnailCaptureRef = useRef(0);
  const loadedItemContentRef = useRef<string | null>(null);
  const THUMBNAIL_RECAPTURE_INTERVAL_MS = 10000;

  const handleContentApplied = useCallback((itemId: string) => {
    loadedItemContentRef.current = itemId;
  }, []);

  const flushPendingContent = useCallback((captureThumbnail: boolean) => {
    if (saveContentTimeoutRef.current) {
      clearTimeout(saveContentTimeoutRef.current);
      saveContentTimeoutRef.current = null;
    }
    const pending = pendingContentRef.current;
    if (!pending) return;
    pendingContentRef.current = null;
    setSaveStatus('saving');
    saveItemContent(pending.itemId, pending.content)
      .then(() => {
        setSaveStatus('saved');
        if (captureThumbnail && pending.itemId === firstItemIdRef.current) {
          lastThumbnailCaptureRef.current = Date.now();
          setThumbnailCapture({
            title: itemsRef.current[pending.itemId]?.title ?? '',
            titleAlign: itemsRef.current[pending.itemId]?.titleAlign ?? 'center',
            content: pending.content,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        setSaveStatus('error');
        if (!pendingContentRef.current) {
          pendingContentRef.current = pending;
        }
      });
  }, []);

  useEffect(() => {
    // capture the thumbnail only when actually leaving the item, not on every autosave tick
    return () => flushPendingContent(true);
  }, [selectedItemId, flushPendingContent]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!pendingContentRef.current) return;
      flushPendingContent(false);
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushPendingContent]);

  const onChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      if (!selectedItemId) return;
      if (loadedItemContentRef.current !== selectedItemId) return;
      const json = JSON.stringify(editorState.toJSON());
      setItems(prevItems => {
        const item = prevItems[selectedItemId];
        if (!item) return prevItems;
        return { ...prevItems, [selectedItemId]: { ...item, content: json } };
      });

      pendingContentRef.current = { itemId: selectedItemId, content: json };
      setSaveStatus('saving');
      if (saveContentTimeoutRef.current) clearTimeout(saveContentTimeoutRef.current);
      const dueForThumbnailRecapture = Date.now() - lastThumbnailCaptureRef.current > THUMBNAIL_RECAPTURE_INTERVAL_MS;
      saveContentTimeoutRef.current = setTimeout(() => flushPendingContent(dueForThumbnailRecapture), 600);
    });
  }, [selectedItemId, flushPendingContent]);

  const startEditTitle = () => {
    setEditingTitleValue(projectTitle);
    setIsEditingTitle(true);
  };

  const submitEditTitle = () => {
    const title = editingTitleValue.trim();
    setIsEditingTitle(false);
    if (!title || title === projectTitle) return;
    setProjectTitle(title);
    renameProject(projectId, title);
  };

  if (!loaded) {
    return null;
  }

  return (
    <SidebarProvider
      open={leftSidebarOpen}
      onOpenChange={setLeftSidebarOpen}
      style={{ "--sidebar-width": "288px", "--sidebar-width-icon": "272px" } as React.CSSProperties}
      className="h-screen min-h-0 flex-col"
    >
      <ProjectShell
        homeHref="/projects"
        titleSlot={
          isEditingTitle ? (
            <Input
              autoFocus
              value={editingTitleValue}
              className="h-8 max-w-xs"
              onChange={(e) => setEditingTitleValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitEditTitle();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              onBlur={submitEditTitle}
            />
          ) : (
            <div className="flex gap-4">
              <span
                className="text-[15px] font-medium"
                onDoubleClick={startEditTitle}
                title="Double-click to rename"
              >
                {projectTitle}
              </span>
              <span
                className="flex items-center gap-1.5 text-xs text-muted-foreground w-[60px]"
              >
                {saveStatus === 'saving' && (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <Check className="h-3.5 w-3.5 text-primary" />
                    Saved
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    Save failed
                  </>
                )}
              </span>
            </div>
          )
        }
        actions={
          <>
            {view === 'editor' && selectedItem && (
              <span className="text-xs text-muted-foreground">
                {textStats.words} words · {textStats.characters} characters
              </span>
            )}
            <ShareDialog
              projectId={projectId}
              visibility={visibility}
              onVisibilityChange={handleVisibilityChange}
              description={description}
              onDescriptionChange={setDescription}
              tags={tags}
              onTagsChange={setTags}
            />
            <UserMenu loggedIn={!!profile} username={profile?.username ?? null} imageUrl={profile?.imageUrl ?? null} />
          </>
        }
        sidebar={
          <SidebarCustom
            trails={trails}
            items={items}
            selectedItemId={selectedItemId}
            onSelectItem={handleSelectItem}
            onCreateTrail={handleCreateTrail}
            onCreateItem={handleCreateItem}
            onLinkItemToTrail={handleLinkItemToTrail}
            onRenameTrail={handleRenameTrail}
            onRenameItem={handleRenameItem}
            onDeleteTrail={handleDeleteTrail}
            onUnlinkItemFromTrail={handleUnlinkItemFromTrail}
          />
        }
        content={
          view === 'graph' ? (
            <div className="relative flex-1 overflow-hidden rounded-2xl">
              <button
                type="button"
                onClick={() => setView('editor')}
                title="Close graph view"
                className="absolute top-6 right-6 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
              <KnowledgeGraph
                trails={trails}
                items={items}
                selectedItemId={selectedItemId}
                onSelectItem={handleSelectItem}
              />
            </div>
          ) : selectedItem ? (
            <>
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden ">
                <LexicalComposer initialConfig={editorConfig}>
                  <div className="editor-container flex flex-1 min-h-0 flex-col">
                    <ToolbarPlugin
                      titleFocused={activeAlignTarget === 'title'}
                      titleAlign={selectedItem.titleAlign}
                      onSetTitleAlign={(align) => handleSetItemTitleAlign(selectedItem.id, align)}
                    />
                    <hr/>
                    <div className="editor-inner" ref={editorInnerRef}>
                      <div className="editor-content-column" ref={setBlockAnchor}>
                        <div className="pt-9 pl-7">
                          <input
                            key={`${selectedItem.id}-${selectedItem.title}`}
                            defaultValue={selectedItem.title}
                            onFocus={() => setActiveAlignTarget('title')}
                            onBlur={(e) => commitItemTitle(selectedItem.id, selectedItem.title, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            placeholder="Untitled"
                            style={{ textAlign: selectedItem.titleAlign }}
                            className="w-full border-0 bg-transparent font-display text-[28px] font-medium text-foreground outline-none placeholder:text-muted-foreground/40"
                          />
                        </div>
                        <div className="relative grid flex-1 min-h-0">
                          <RichTextPlugin
                            contentEditable={
                              <ContentEditable
                                className="editor-input"
                                aria-placeholder={placeholder}
                                onFocus={() => setActiveAlignTarget('body')}
                                placeholder={
                                  <div className="editor-placeholder">{placeholder}</div>
                                }
                              />
                            }
                            ErrorBoundary={LexicalErrorBoundary}
                          />
                        </div>
                        <HistoryPlugin />
                        <AutoFocusPlugin />
                        <ListPlugin />
                        <CheckListPlugin />
                        <LinkPlugin />
                        <ItemLinkClickPlugin onNavigate={(itemId) => {
                          const item = items[itemId];
                          if (item) handleSelectItem(item);
                        }} />
                        <ClickableLinkPlugin newTab />
                        <ImagesPlugin />
                        <PastePlugin />
                        <CodeHighlightPlugin />
                        <TabIndentationPlugin />
                        <HorizontalRulePlugin />
                        <SlashMenuPlugin />
                        <FloatingLinkEditorPlugin />
                        <FindReplacePlugin />
                        {blockAnchor && <DraggableBlockPlugin anchorElem={blockAnchor} />}
                        <ItemMentionPlugin
                          items={items}
                          currentItemId={selectedItem.id}
                          onLinkItem={handleLinkItems}
                        />
                        <WikiLinkPlugin
                          items={items}
                          currentItemId={selectedItem.id}
                          onLinkItem={handleLinkItems}
                        />
                        <MarkdownShortcutPlugin transformers={EDITOR_TRANSFORMERS} />

                        <UpdateContentPlugin content={selectedItem.content} itemId={selectedItem.id} onContentApplied={handleContentApplied} />
                        <OnChangePlugin onChange={onChange} ignoreSelectionChange />
                      </div>
                    </div>
                  </div>
                </LexicalComposer>
              </div>
              <ConnectionsPanel
                item={selectedItem}
                items={items}
                trails={trails}
                onSelectItem={handleSelectItem}
                onLinkItem={handleLinkItems}
                onUnlinkItem={handleUnlinkItems}
                onLinkTrail={handleLinkItemToTrail}
                onOpenGraph={() => setView('graph')}
                open={connectionsPanelOpen}
                onToggleOpen={() => setConnectionsPanelOpen((o) => !o)}
              />
            </>
          ) : (
            <div className="flex h-full w-full min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-popover text-center text-muted-foreground">
              <FolderPlus className="h-12 w-12 opacity-40" />
              <p className="text-lg font-medium">
                {trails.length === 0 ? "No trails yet" : "No item selected"}
              </p>
              <p className="max-w-sm text-sm">
                {trails.length === 0
                  ? 'Create a trail from the sidebar (the "+" next to "My Trails") to get started.'
                  : "Select an item from the sidebar, or create a new one inside a trail."}
              </p>
            </div>
          )
        }
      />
      {thumbnailCapture && (
        <ThumbnailCapture
          title={thumbnailCapture.title}
          titleAlign={thumbnailCapture.titleAlign}
          content={thumbnailCapture.content}
          onCapture={handleThumbnailCaptured}
        />
      )}
    </SidebarProvider>
  )
}
