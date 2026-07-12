/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
import Link from 'next/link';
import { Wordmark } from '@/components/logo';
import { SidebarCustom } from '@/components/sidebar-custom';
import { ConnectionsPanel } from '@/components/connections-panel';
import { KnowledgeGraph } from '@/components/knowledge-graph';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { UserMenu } from '@/components/user-menu';
import { Input } from '@/components/ui/input';
import { AlertCircle, Check, FolderPlus, Loader2, X } from 'lucide-react';
import { Path, Idea } from '../types';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getProject,
  renameProject,
  createPath,
  renamePath,
  deletePath as deletePathRequest,
  createIdea,
  renameIdea,
  attachIdeaToPath,
  detachIdeaFromPath,
  linkIdeas as linkIdeasRequest,
  unlinkIdeas as unlinkIdeasRequest,
  setProjectThumbnail,
  type ProjectVisibility,
} from '@/lib/projects-store';
import { getIdeaContent, saveIdeaContent } from '@/lib/idea-content-client';
import { ShareDialog } from '@/components/share-dialog';
import { ThumbnailCapture } from '@/components/thumbnail-capture';

const placeholder = 'Enter some rich text...';


const removeStylesExportDOM = (
  editor: LexicalEditor,
  target: LexicalNode,
): DOMExportOutput => {
  const output = target.exportDOM(editor);
  if (output && isHTMLElement(output.element)) {
    // Remove all inline styles and classes if the element is an HTMLElement
    // Children are checked as well since TextNode can be nested
    // in i, b, and strong tags.
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
  // Parse styles from pasted input, but only if they match exactly the
  // sort of styles that would be produced by exportDOM
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

  // Wrap all TextNode importers with a function that also imports
  // the custom styles implemented by the playground
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

export default function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('private');
  const [tags, setTags] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  const [paths, setPaths] = useState<Path[]>([]);
  const [ideas, setIdeas] = useState<Record<string, Idea>>({});
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<'editor' | 'graph'>('editor');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [thumbnailCaptureContent, setThumbnailCaptureContent] = useState<string | null>(null);

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
      setTags(project.tags);
      setPaths(project.paths);
      setIdeas(project.ideas);
      setLoaded(true);

      // Restores whichever idea was open before a reload, so navigating away
      // and back (or refreshing) doesn't dump you back at the empty state.
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

  // Keeps the last-selected idea per project so it can be restored on reload.
  useEffect(() => {
    if (!loaded) return;
    if (selectedIdeaId) {
      localStorage.setItem(lastIdeaStorageKey(projectId), selectedIdeaId);
    } else {
      localStorage.removeItem(lastIdeaStorageKey(projectId));
    }
  }, [projectId, selectedIdeaId, loaded]);

  const selectedIdea = selectedIdeaId ? ideas[selectedIdeaId] : undefined;

  // Fetches content before switching so UpdateContentPlugin (keyed on ideaId, to
  // avoid clobbering in-progress edits) sees the right content on the same render
  // that selectedIdeaId changes, instead of racing a late content update.
  const handleSelectIdea = async (idea: Idea) => {
    setView('editor');
    try {
      const content = await getIdeaContent(idea.id);
      setIdeas(prevIdeas => {
        const existing = prevIdeas[idea.id];
        if (!existing) return prevIdeas;
        return { ...prevIdeas, [idea.id]: { ...existing, content } };
      });
    } catch (err) {
      console.error(err);
    }
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

  // Attaches an idea that already exists (possibly in another path) to another path too.
  const handleLinkIdeaToPath = async (pathId: string, ideaId: string) => {
    await attachIdeaToPath(pathId, ideaId);
    setPaths(prevPaths => prevPaths.map(path =>
      path.id === pathId && !path.ideaIds.includes(ideaId)
        ? { ...path, ideaIds: [...path.ideaIds, ideaId] }
        : path
    ));
  };

  // Removes an idea from one path. If that was the idea's last path, the backend deletes it entirely.
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

  // Symmetric idea-to-idea link: linking A to B also links B to A.
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

  // Tracks the current first idea (across saves/reorders) without making the
  // debounced save callback below depend on `paths`, which would otherwise
  // change identity — and re-trigger its cleanup effect — on every edit.
  const firstIdeaIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    firstIdeaIdRef.current = paths.flatMap(path => path.ideaIds)[0];
  }, [paths]);

  const handleVisibilityChange = async (next: ProjectVisibility) => {
    setVisibility(next);
    // Fallback for projects published without ever re-editing the first idea
    // in this session — the save-triggered capture below won't have fired yet.
    if (next !== 'published') return;

    const firstIdeaId = firstIdeaIdRef.current;
    if (!firstIdeaId) return;

    try {
      const content = await getIdeaContent(firstIdeaId);
      if (content) setThumbnailCaptureContent(content);
    } catch (err) {
      console.error(err);
    }
  };

  const handleThumbnailCaptured = useCallback(async (dataUrl: string | null) => {
    setThumbnailCaptureContent(null);
    if (!dataUrl) return;
    try {
      await setProjectThumbnail(projectId, dataUrl);
    } catch (err) {
      console.error(err);
    }
  }, [projectId]);

  // Debounces content saves so we don't hit the backend on every keystroke; flushed
  // immediately when switching ideas or leaving the page so nothing pending is lost.
  const pendingContentRef = useRef<{ ideaId: string; content: string } | null>(null);
  const saveContentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingContent = useCallback(() => {
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
        // Keeps the project card's preview fresh as the first idea changes —
        // covers private/unlisted projects too, not just published ones.
        if (pending.ideaId === firstIdeaIdRef.current) {
          setThumbnailCaptureContent(pending.content);
        }
      })
      .catch((err) => {
        console.error(err);
        setSaveStatus('error');
      });
  }, []);

  useEffect(() => {
    return () => flushPendingContent();
  }, [selectedIdeaId, flushPendingContent]);

  const onChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      if (!selectedIdeaId) return;
      const json = JSON.stringify(editorState.toJSON());
      setIdeas(prevIdeas => {
        const idea = prevIdeas[selectedIdeaId];
        if (!idea) return prevIdeas;
        return { ...prevIdeas, [selectedIdeaId]: { ...idea, content: json } };
      });

      pendingContentRef.current = { ideaId: selectedIdeaId, content: json };
      setSaveStatus('saving');
      if (saveContentTimeoutRef.current) clearTimeout(saveContentTimeoutRef.current);
      saveContentTimeoutRef.current = setTimeout(flushPendingContent, 600);
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
      style={{ "--sidebar-width": "240px" } as React.CSSProperties}
      className="h-screen min-h-0 flex-col"
    >
      <header
        className="flex h-16 shrink-0 items-center gap-4 px-8"
        style={{ borderBottom: "2px solid var(--color-divider)" }}
      >
        <Link href="/projects" title="Back to projects">
          <Wordmark />
        </Link>
        <span className="h-[18px] w-[2px]" style={{ background: "var(--color-divider)" }} />
        {isEditingTitle ? (
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
            className="text-[15px] font-bold"
            onDoubleClick={startEditTitle}
            title="Double-click to rename"
          >
            {projectTitle}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {view === 'graph' && (
            <button
              type="button"
              onClick={() => setView('editor')}
              title="Close graph view"
              className="flex h-8 w-8 items-center justify-center"
              style={{ color: "var(--color-neutral-600)" }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ShareDialog
            projectId={projectId}
            visibility={visibility}
            onVisibilityChange={handleVisibilityChange}
            tags={tags}
            onTagsChange={setTags}
          />
          <span
            className="flex items-center gap-1.5 text-xs"
            style={{ color: 'var(--color-neutral-700)', width: 60 }}
          >
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving
              </>
            )}
            {(saveStatus === 'saved' || saveStatus === 'idle') && (
              <>
                <Check className="h-3.5 w-3.5" style={{ color: 'var(--color-accent)' }} />
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
          <UserMenu />
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
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
        <SidebarInset>
          <div className={view === 'graph' ? 'flex-1 overflow-hidden p-4' : 'flex flex-1 min-h-0'}>
          {view === 'graph' ? (
            <KnowledgeGraph
              paths={paths}
              ideas={ideas}
              selectedIdeaId={selectedIdeaId}
              onSelectIdea={handleSelectIdea}
            />
          ) : selectedIdea ? (
            <>
              <div className="flex min-w-0 flex-1 flex-col">
                <LexicalComposer initialConfig={editorConfig}>
                  <div className="editor-container flex flex-1 min-h-0 flex-col">
                    <ToolbarPlugin />
                    <div className="editor-inner">
                      <div className="editor-content-column">
                        <RichTextPlugin
                          contentEditable={
                            <ContentEditable
                              className="editor-input"
                              aria-placeholder={placeholder}
                              placeholder={
                                <div className="editor-placeholder">{placeholder}</div>
                              }
                            />
                          }
                          ErrorBoundary={LexicalErrorBoundary}
                        />
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

                        <UpdateContentPlugin content={selectedIdea.content} ideaId={selectedIdea.id} />
                        <OnChangePlugin onChange={onChange} />
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
            <div className="flex h-full w-full min-h-[60vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
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
          )}
        </div>
        </SidebarInset>
      </div>
      {thumbnailCaptureContent && (
        <ThumbnailCapture content={thumbnailCaptureContent} onCapture={handleThumbnailCaptured} />
      )}
    </SidebarProvider>
  )
}
