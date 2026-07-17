
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
import { TRANSFORMERS } from '@lexical/markdown';
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
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';

import ExampleTheme from '../ExampleTheme';
import ToolbarPlugin from '../plugins/ToolbarPlugin';
import UpdateContentPlugin from '../plugins/UpdateContentPlugin';
import ImagesPlugin from '../plugins/ImagesPlugin';
import IdeaMentionPlugin from '../plugins/IdeaMentionPlugin';
import IdeaLinkClickPlugin from '../plugins/IdeaLinkClickPlugin';
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
import { Path, Idea, TitleAlign } from '../types';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getProject,
  renameProject,
  createPath,
  renamePath,
  deletePath as deletePathRequest,
  createIdea,
  renameIdea,
  setIdeaTitleAlign,
  attachIdeaToPath,
  detachIdeaFromPath,
  linkIdeas as linkIdeasRequest,
  unlinkIdeas as unlinkIdeasRequest,
  setProjectThumbnail,
  type ProjectVisibility,
} from '@/lib/projects-store';
import { getIdeaContent, saveIdeaContent } from '@/lib/idea-content-client';
import { getMyProfile } from '@/lib/profile';
import { uploadImage } from '@/lib/upload-image';
import { ShareDialog } from '@/components/share-dialog';
import { ThumbnailCapture } from '@/components/thumbnail-capture';

const placeholder = 'Enter some rich text...';


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
  namespace: 'React.js Demo',
  nodes: [
    ParagraphNode,
    TextNode,
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    CodeNode,
    CodeHighlightNode,
    TableNode,
    TableCellNode,
    TableRowNode,
    AutoLinkNode,
    LinkNode,
    ImageNode,
  ],
  onError(error: Error) {
    throw error;
  },
  theme: ExampleTheme,
};

const lastIdeaStorageKey = (projectId: string) => `mypath:lastIdea:${projectId}`;

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

  const [paths, setPaths] = useState<Path[]>([]);
  const [ideas, setIdeas] = useState<Record<string, Idea>>({});
  const ideasRef = useRef<Record<string, Idea>>({});
  useEffect(() => {
    ideasRef.current = ideas;
  }, [ideas]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<'editor' | 'graph'>('editor');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [thumbnailCapture, setThumbnailCapture] = useState<{ title: string; titleAlign: TitleAlign; content: string } | null>(null);
  const [profile, setProfile] = useState<{ username: string; imageUrl: string | null } | null>(null);

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
      setPaths(project.paths);
      setIdeas(project.ideas);
      setLoaded(true);

      const savedIdeaId = localStorage.getItem(lastIdeaStorageKey(projectId));
      const savedIdea = savedIdeaId ? project.ideas[savedIdeaId] : undefined;
      if (!savedIdea) return;

      try {
        const content = await getIdeaContent(savedIdea.id);
        if (cancelled) return;
        setIdeas(prevIdeas => {
          const existing = prevIdeas[savedIdea.id];
          if (!existing) return prevIdeas;
          return { ...prevIdeas, [savedIdea.id]: { ...existing, content } };
        });
      } catch (err) {
        console.error(err);
      }
      if (!cancelled) setSelectedIdeaId(savedIdea.id);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, router]);

  useEffect(() => {
    if (!loaded) return;
    if (selectedIdeaId) {
      localStorage.setItem(lastIdeaStorageKey(projectId), selectedIdeaId);
    } else {
      localStorage.removeItem(lastIdeaStorageKey(projectId));
    }
  }, [projectId, selectedIdeaId, loaded]);

  const selectedIdea = selectedIdeaId ? ideas[selectedIdeaId] : undefined;
  const textStats = useMemo(() => countTextStats(selectedIdea?.content ?? ''), [selectedIdea?.content]);

  const [activeAlignTarget, setActiveAlignTarget] = useState<'title' | 'body'>('body');

  const editorInnerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = editorInnerRef.current;
    if (!el) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.scrollTop = 0;
    }));
  }, [selectedIdeaId]);

  const commitIdeaTitle = (ideaId: string, currentTitle: string, nextValue: string) => {
    const trimmed = nextValue.trim();
    if (!trimmed || trimmed === currentTitle) return;
    handleRenameIdea(ideaId, trimmed);
  };

  const handleSetIdeaTitleAlign = async (ideaId: string, titleAlign: TitleAlign) => {
    setIdeas(prevIdeas => {
      const idea = prevIdeas[ideaId];
      if (!idea) return prevIdeas;
      return { ...prevIdeas, [ideaId]: { ...idea, titleAlign } };
    });
    await setIdeaTitleAlign(ideaId, titleAlign);
  };

  const selectIdeaRequestRef = useRef(0);

  const handleSelectIdea = async (idea: Idea) => {
    setView('editor');
    const requestId = ++selectIdeaRequestRef.current;
    try {
      const content = await getIdeaContent(idea.id);
      if (selectIdeaRequestRef.current !== requestId) return;
      setIdeas(prevIdeas => {
        const existing = prevIdeas[idea.id];
        if (!existing) return prevIdeas;
        return { ...prevIdeas, [idea.id]: { ...existing, content } };
      });
    } catch (err) {
      console.error(err);
    }
    if (selectIdeaRequestRef.current !== requestId) return;
    setSelectedIdeaId(idea.id);
  };

  const handleCreatePath = async (title: string) => {
    const newPath = await createPath(projectId, title);
    setPaths(prevPaths => [...prevPaths, newPath]);
  };

  const handleCreateIdea = async (pathId: string, title: string) => {
    const newIdea = await createIdea(pathId, title);
    setIdeas(prevIdeas => ({ ...prevIdeas, [newIdea.id]: newIdea }));
    setPaths(prevPaths => prevPaths.map(path =>
      path.id === pathId
        ? { ...path, ideaIds: [...path.ideaIds, newIdea.id] }
        : path
    ));
    setSelectedIdeaId(newIdea.id);
  };

  const handleLinkIdeaToPath = async (pathId: string, ideaId: string) => {
    await attachIdeaToPath(pathId, ideaId);
    setPaths(prevPaths => prevPaths.map(path =>
      path.id === pathId && !path.ideaIds.includes(ideaId)
        ? { ...path, ideaIds: [...path.ideaIds, ideaId] }
        : path
    ));
  };

  const handleUnlinkIdeaFromPath = async (pathId: string, ideaId: string) => {
    await detachIdeaFromPath(pathId, ideaId);
    const nextPaths = paths.map(path =>
      path.id === pathId
        ? { ...path, ideaIds: path.ideaIds.filter(id => id !== ideaId) }
        : path
    );
    setPaths(nextPaths);

    const stillReferenced = nextPaths.some(path => path.ideaIds.includes(ideaId));
    if (!stillReferenced) {
      setIdeas(prevIdeas => {
        const next = { ...prevIdeas };
        delete next[ideaId];
        return next;
      });
      if (selectedIdeaId === ideaId) {
        setSelectedIdeaId(undefined);
      }
    }
  };

  const handleRenamePath = async (pathId: string, title: string) => {
    await renamePath(pathId, title);
    setPaths(prevPaths => prevPaths.map(path =>
      path.id === pathId ? { ...path, title } : path
    ));
  };

  const handleRenameIdea = async (ideaId: string, title: string) => {
    await renameIdea(ideaId, title);
    setIdeas(prevIdeas => {
      const idea = prevIdeas[ideaId];
      if (!idea) return prevIdeas;
      return { ...prevIdeas, [ideaId]: { ...idea, title } };
    });
  };

  const handleDeletePath = async (pathId: string) => {
    const target = paths.find(path => path.id === pathId);
    if (!target) return;

    await deletePathRequest(pathId);

    const remainingPaths = paths.filter(path => path.id !== pathId);
    const orphanIds = target.ideaIds.filter(
      ideaId => !remainingPaths.some(path => path.ideaIds.includes(ideaId))
    );

    setPaths(remainingPaths);
    if (orphanIds.length > 0) {
      setIdeas(prevIdeas => {
        const next = { ...prevIdeas };
        orphanIds.forEach(id => delete next[id]);
        return next;
      });
      if (selectedIdeaId && orphanIds.includes(selectedIdeaId)) {
        setSelectedIdeaId(undefined);
      }
    }
  };

  const handleLinkIdeas = async (ideaId: string, otherIdeaId: string) => {
    if (ideaId === otherIdeaId) return;
    await linkIdeasRequest(ideaId, otherIdeaId);
    setIdeas(prevIdeas => {
      const a = prevIdeas[ideaId];
      const b = prevIdeas[otherIdeaId];
      if (!a || !b) return prevIdeas;
      const next = { ...prevIdeas };
      if (!a.linkedIdeaIds.includes(otherIdeaId)) {
        next[ideaId] = { ...a, linkedIdeaIds: [...a.linkedIdeaIds, otherIdeaId] };
      }
      if (!b.linkedIdeaIds.includes(ideaId)) {
        next[otherIdeaId] = { ...b, linkedIdeaIds: [...b.linkedIdeaIds, ideaId] };
      }
      return next;
    });
  };

  const handleUnlinkIdeas = async (ideaId: string, otherIdeaId: string) => {
    await unlinkIdeasRequest(ideaId, otherIdeaId);
    setIdeas(prevIdeas => {
      const a = prevIdeas[ideaId];
      const b = prevIdeas[otherIdeaId];
      if (!a || !b) return prevIdeas;
      return {
        ...prevIdeas,
        [ideaId]: { ...a, linkedIdeaIds: a.linkedIdeaIds.filter(id => id !== otherIdeaId) },
        [otherIdeaId]: { ...b, linkedIdeaIds: b.linkedIdeaIds.filter(id => id !== ideaId) },
      };
    });
  };

  const firstIdeaIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    firstIdeaIdRef.current = paths.flatMap(path => path.ideaIds)[0];
  }, [paths]);

  const handleVisibilityChange = async (next: ProjectVisibility) => {
    setVisibility(next);
    if (next !== 'published') return;

    const firstIdeaId = firstIdeaIdRef.current;
    if (!firstIdeaId) return;

    try {
      const content = await getIdeaContent(firstIdeaId);
      if (content) setThumbnailCapture({
        title: ideasRef.current[firstIdeaId]?.title ?? '',
        titleAlign: ideasRef.current[firstIdeaId]?.titleAlign ?? 'center',
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

  const pendingContentRef = useRef<{ ideaId: string; content: string } | null>(null);
  const saveContentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastThumbnailCaptureRef = useRef(0);
  const loadedIdeaContentRef = useRef<string | null>(null);
  const THUMBNAIL_RECAPTURE_INTERVAL_MS = 10000;

  const handleContentApplied = useCallback((ideaId: string) => {
    loadedIdeaContentRef.current = ideaId;
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
    saveIdeaContent(pending.ideaId, pending.content)
      .then(() => {
        setSaveStatus('saved');
        if (captureThumbnail && pending.ideaId === firstIdeaIdRef.current) {
          lastThumbnailCaptureRef.current = Date.now();
          setThumbnailCapture({
            title: ideasRef.current[pending.ideaId]?.title ?? '',
            titleAlign: ideasRef.current[pending.ideaId]?.titleAlign ?? 'center',
            content: pending.content,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        setSaveStatus('error');
      });
  }, []);

  useEffect(() => {
    // capture the thumbnail only when actually leaving the idea, not on every autosave tick
    return () => flushPendingContent(true);
  }, [selectedIdeaId, flushPendingContent]);

  const onChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      if (!selectedIdeaId) return;
      if (loadedIdeaContentRef.current !== selectedIdeaId) return;
      const json = JSON.stringify(editorState.toJSON());
      setIdeas(prevIdeas => {
        const idea = prevIdeas[selectedIdeaId];
        if (!idea) return prevIdeas;
        return { ...prevIdeas, [selectedIdeaId]: { ...idea, content: json } };
      });

      pendingContentRef.current = { ideaId: selectedIdeaId, content: json };
      setSaveStatus('saving');
      if (saveContentTimeoutRef.current) clearTimeout(saveContentTimeoutRef.current);
      const dueForThumbnailRecapture = Date.now() - lastThumbnailCaptureRef.current > THUMBNAIL_RECAPTURE_INTERVAL_MS;
      saveContentTimeoutRef.current = setTimeout(() => flushPendingContent(dueForThumbnailRecapture), 600);
    });
  }, [selectedIdeaId, flushPendingContent]);

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
      style={{ "--sidebar-width": "288px" } as React.CSSProperties}
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
            <span
              className="text-[15px] font-medium"
              onDoubleClick={startEditTitle}
              title="Double-click to rename"
            >
              {projectTitle}
            </span>
          )
        }
        actions={
          <>
            {view === 'editor' && selectedIdea && (
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
            <span
              className="flex items-center gap-1.5 text-xs text-muted-foreground w-[60px]"
            >
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving
                </>
              )}
              {(saveStatus === 'saved' || saveStatus === 'idle') && (
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
            <UserMenu loggedIn={!!profile} username={profile?.username ?? null} imageUrl={profile?.imageUrl ?? null} />
          </>
        }
        sidebar={
          <SidebarCustom
            paths={paths}
            ideas={ideas}
            selectedIdeaId={selectedIdeaId}
            onSelectIdea={handleSelectIdea}
            onCreatePath={handleCreatePath}
            onCreateIdea={handleCreateIdea}
            onLinkIdeaToPath={handleLinkIdeaToPath}
            onRenamePath={handleRenamePath}
            onRenameIdea={handleRenameIdea}
            onDeletePath={handleDeletePath}
            onUnlinkIdeaFromPath={handleUnlinkIdeaFromPath}
          />
        }
        content={
          view === 'graph' ? (
            <div className="relative flex-1 overflow-hidden rounded-2xl bg-popover">
              <button
                type="button"
                onClick={() => setView('editor')}
                title="Close graph view"
                className="absolute top-6 right-6 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
              <KnowledgeGraph
                paths={paths}
                ideas={ideas}
                selectedIdeaId={selectedIdeaId}
                onSelectIdea={handleSelectIdea}
              />
            </div>
          ) : selectedIdea ? (
            <>
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-popover">
                <LexicalComposer initialConfig={editorConfig}>
                  <div className="editor-container flex flex-1 min-h-0 flex-col">
                    <ToolbarPlugin
                      titleFocused={activeAlignTarget === 'title'}
                      titleAlign={selectedIdea.titleAlign}
                      onSetTitleAlign={(align) => handleSetIdeaTitleAlign(selectedIdea.id, align)}
                    />
                    <div className="editor-inner" ref={editorInnerRef}>
                      <div className="editor-content-column">
                        <div className="pt-9">
                          <input
                            key={`${selectedIdea.id}-${selectedIdea.title}`}
                            defaultValue={selectedIdea.title}
                            onFocus={() => setActiveAlignTarget('title')}
                            onBlur={(e) => commitIdeaTitle(selectedIdea.id, selectedIdea.title, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            placeholder="Untitled"
                            style={{ textAlign: selectedIdea.titleAlign }}
                            className="w-full border-0 bg-transparent font-display text-[28px] font-medium text-foreground outline-none placeholder:text-muted-foreground/40"
                          />
                        </div>
                        <div className="relative flex flex-1 min-h-0 flex-col">
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
                        <IdeaLinkClickPlugin onNavigate={(ideaId) => {
                          const idea = ideas[ideaId];
                          if (idea) handleSelectIdea(idea);
                        }} />
                        <ClickableLinkPlugin newTab />
                        <ImagesPlugin />
                        <IdeaMentionPlugin
                          ideas={ideas}
                          currentIdeaId={selectedIdea.id}
                          onLinkIdea={handleLinkIdeas}
                        />
                        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />

                        <UpdateContentPlugin content={selectedIdea.content} ideaId={selectedIdea.id} onContentApplied={handleContentApplied} />
                        <OnChangePlugin onChange={onChange} ignoreSelectionChange />
                      </div>
                    </div>
                  </div>
                </LexicalComposer>
              </div>
              <ConnectionsPanel
                idea={selectedIdea}
                ideas={ideas}
                paths={paths}
                onSelectIdea={handleSelectIdea}
                onLinkIdea={handleLinkIdeas}
                onUnlinkIdea={handleUnlinkIdeas}
                onLinkPath={handleLinkIdeaToPath}
                onOpenGraph={() => setView('graph')}
              />
            </>
          ) : (
            <div className="flex h-full w-full min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-popover text-center text-muted-foreground">
              <FolderPlus className="h-12 w-12 opacity-40" />
              <p className="text-lg font-medium">
                {paths.length === 0 ? "No paths yet" : "No idea selected"}
              </p>
              <p className="max-w-sm text-sm">
                {paths.length === 0
                  ? 'Create a path from the sidebar (the "+" next to "My Paths") to get started.'
                  : "Select an idea from the sidebar, or create a new one inside a path."}
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
