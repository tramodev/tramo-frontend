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
import TreeViewPlugin from '../plugins/TreeViewPlugin';
import UpdateContentPlugin from '../plugins/UpdateContentPlugin';
import ImagesPlugin from '../plugins/ImagesPlugin';
import { ImageNode } from '../nodes/ImageNode';
import { parseAllowedColor, parseAllowedFontSize } from '../styleConfig';
import { SidebarCustom } from '@/components/sidebar-custom';
import { IdeaLinksPanel } from '@/components/idea-links-panel';
import { KnowledgeGraph } from '@/components/knowledge-graph';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenu } from '@/components/user-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderPlus, Network, Pencil } from 'lucide-react';
import { Path, Idea } from '../types';
import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject, renameProject, saveProjectContent, type ProjectVisibility } from '@/lib/projects-store';
import { ShareDialog } from '@/components/share-dialog';

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

export default function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('private');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  const [paths, setPaths] = useState<Path[]>([]);
  const [ideas, setIdeas] = useState<Record<string, Idea>>({});
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<'editor' | 'graph'>('editor');

  useEffect(() => {
    let cancelled = false;
    getProject(projectId).then((project) => {
      if (cancelled) return;
      if (!project) {
        router.replace('/projects');
        return;
      }
      setProjectTitle(project.title);
      setVisibility(project.visibility);
      setPaths(project.paths);
      setIdeas(project.ideas);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, router]);

  useEffect(() => {
    if (!loaded) return;
    saveProjectContent(projectId, { paths, ideas });
  }, [loaded, projectId, paths, ideas]);

  const selectedIdea = selectedIdeaId ? ideas[selectedIdeaId] : undefined;

  const handleSelectIdea = (idea: Idea) => {
    setSelectedIdeaId(idea.id);
    setView('editor');
  };

  const handleCreatePath = (title: string) => {
    const newPath: Path = {
      id: `path-${crypto.randomUUID()}`,
      title,
      ideaIds: [],
    };
    setPaths(prevPaths => [...prevPaths, newPath]);
  };

  const handleCreateIdea = (pathId: string, title: string) => {
    const newIdea: Idea = {
      id: `idea-${crypto.randomUUID()}`,
      title,
      content: '',
      linkedIdeaIds: [],
    };
    setIdeas(prevIdeas => ({ ...prevIdeas, [newIdea.id]: newIdea }));
    setPaths(prevPaths => prevPaths.map(path =>
      path.id === pathId
        ? { ...path, ideaIds: [...path.ideaIds, newIdea.id] }
        : path
    ));
    setSelectedIdeaId(newIdea.id);
  };

  // Attaches an idea that already exists (possibly in another path) to another path too.
  const handleLinkIdeaToPath = (pathId: string, ideaId: string) => {
    setPaths(prevPaths => prevPaths.map(path =>
      path.id === pathId && !path.ideaIds.includes(ideaId)
        ? { ...path, ideaIds: [...path.ideaIds, ideaId] }
        : path
    ));
  };

  // Removes an idea from one path. If that was the idea's last path, the idea is deleted entirely.
  const handleUnlinkIdeaFromPath = (pathId: string, ideaId: string) => {
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

  const handleRenamePath = (pathId: string, title: string) => {
    setPaths(prevPaths => prevPaths.map(path =>
      path.id === pathId ? { ...path, title } : path
    ));
  };

  const handleRenameIdea = (ideaId: string, title: string) => {
    setIdeas(prevIdeas => {
      const idea = prevIdeas[ideaId];
      if (!idea) return prevIdeas;
      return { ...prevIdeas, [ideaId]: { ...idea, title } };
    });
  };

  const handleDeletePath = (pathId: string) => {
    const target = paths.find(path => path.id === pathId);
    if (!target) return;

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
  const handleLinkIdeas = (ideaId: string, otherIdeaId: string) => {
    if (ideaId === otherIdeaId) return;
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

  const handleUnlinkIdeas = (ideaId: string, otherIdeaId: string) => {
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

  const onChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      if (!selectedIdeaId) return;
      const json = JSON.stringify(editorState.toJSON());
      setIdeas(prevIdeas => {
        const idea = prevIdeas[selectedIdeaId];
        if (!idea) return prevIdeas;
        return { ...prevIdeas, [selectedIdeaId]: { ...idea, content: json } };
      });
    });
  }, [selectedIdeaId]);

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
    <>
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
        <header
          className="flex h-16 shrink-0 items-center gap-4 px-8"
          style={{ borderBottom: "2px solid var(--color-divider)" }}
        >
          <SidebarTrigger />
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
            <Button
              variant={view === 'graph' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setView(view === 'graph' ? 'editor' : 'graph')}
            >
              {view === 'graph' ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Editor
                </>
              ) : (
                <>
                  <Network className="h-4 w-4" />
                  Graph view
                </>
              )}
            </Button>
            <ShareDialog
              projectId={projectId}
              visibility={visibility}
              onVisibilityChange={setVisibility}
            />
            <UserMenu />
          </div>
        </header>
        <div className={view === 'graph' ? 'flex-1 overflow-hidden p-4' : 'flex-1 overflow-auto px-2 py-2'}>
          {view === 'graph' ? (
            <KnowledgeGraph
              paths={paths}
              ideas={ideas}
              selectedIdeaId={selectedIdeaId}
              onSelectIdea={handleSelectIdea}
            />
          ) : selectedIdea ? (
            <div className="mx-auto flex min-h-full flex-col" >
              <IdeaLinksPanel
                idea={selectedIdea}
                ideas={ideas}
                paths={paths}
                onSelectIdea={handleSelectIdea}
                onLinkIdea={handleLinkIdeas}
                onUnlinkIdea={handleUnlinkIdeas}
                onLinkPath={handleLinkIdeaToPath}
                onUnlinkPath={handleUnlinkIdeaFromPath}
              />
              <LexicalComposer initialConfig={editorConfig}>
                <div className="editor-container flex flex-1 flex-col">
                  <ToolbarPlugin />
                  <div className="editor-inner">
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
                    <TreeViewPlugin />
                    <ListPlugin />
                    <CheckListPlugin />
                    <LinkPlugin />
                    <ClickableLinkPlugin newTab />
                    <ImagesPlugin />
                    <MarkdownShortcutPlugin transformers={TRANSFORMERS} />

                    <UpdateContentPlugin content={selectedIdea.content} ideaId={selectedIdea.id} />
                    <OnChangePlugin onChange={onChange} />
                  </div>
                </div>
              </LexicalComposer>
            </div>
          ) : (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
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
    </>
  )
}
