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

import ExampleTheme from './ExampleTheme';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import UpdateContentPlugin from './plugins/UpdateContentPlugin';
import { parseAllowedColor, parseAllowedFontSize } from './styleConfig';
import { SidebarCustom } from '@/components/sidebar-custom';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { FolderPlus } from 'lucide-react';
import { Path, Idea } from './types';
import { useState, useCallback } from 'react';

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
    LinkNode
  ],
  onError(error: Error) {
    throw error;
  },
  theme: ExampleTheme,
};

export default function DashboardPage() {
  const [paths, setPaths] = useState<Path[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | undefined>(undefined);

  // Helper to find the currently selected idea object
  const selectedIdea = paths
    .flatMap(p => p.ideas)
    .find(i => i.id === selectedIdeaId);

  const handleSelectIdea = (idea: Idea) => {
    setSelectedIdeaId(idea.id);
  };

  const handleCreatePath = (title: string) => {
    const newPath: Path = {
      id: `path-${crypto.randomUUID()}`,
      title,
      ideas: [],
    };
    setPaths(prevPaths => [...prevPaths, newPath]);
  };

  const handleCreateIdea = (pathId: string, title: string) => {
    const newIdea: Idea = {
      id: `idea-${crypto.randomUUID()}`,
      title,
      content: '',
    };
    setPaths(prevPaths => prevPaths.map(path =>
      path.id === pathId
        ? { ...path, ideas: [...path.ideas, newIdea] }
        : path
    ));
    setSelectedIdeaId(newIdea.id);
  };

  const handleRenamePath = (pathId: string, title: string) => {
    setPaths(prevPaths => prevPaths.map(path =>
      path.id === pathId ? { ...path, title } : path
    ));
  };

  const handleRenameIdea = (pathId: string, ideaId: string, title: string) => {
    setPaths(prevPaths => prevPaths.map(path =>
      path.id === pathId
        ? { ...path, ideas: path.ideas.map(idea => idea.id === ideaId ? { ...idea, title } : idea) }
        : path
    ));
  };

  const handleDeletePath = (pathId: string) => {
    setPaths(prevPaths => prevPaths.filter(path => path.id !== pathId));
    setSelectedIdeaId(prev => {
      const deletedPath = paths.find(p => p.id === pathId);
      const hadSelected = deletedPath?.ideas.some(i => i.id === prev);
      return hadSelected ? undefined : prev;
    });
  };

  const handleDeleteIdea = (pathId: string, ideaId: string) => {
    setPaths(prevPaths => prevPaths.map(path =>
      path.id === pathId
        ? { ...path, ideas: path.ideas.filter(idea => idea.id !== ideaId) }
        : path
    ));
    setSelectedIdeaId(prev => (prev === ideaId ? undefined : prev));
  };

  const onChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      // Create a JSON string of the editor state
      const json = JSON.stringify(editorState.toJSON());

      // Update the content of the selected idea in our state
      setPaths(prevPaths => prevPaths.map(path => ({
        ...path,
        ideas: path.ideas.map(idea =>
          idea.id === selectedIdeaId
            ? { ...idea, content: json }
            : idea
        )
      })));
    });
  }, [selectedIdeaId]);

  return (
    <>
      <SidebarCustom
        paths={paths}
        selectedIdeaId={selectedIdeaId}
        onSelectIdea={handleSelectIdea}
        onCreatePath={handleCreatePath}
        onCreateIdea={handleCreateIdea}
        onRenamePath={handleRenamePath}
        onRenameIdea={handleRenameIdea}
        onDeletePath={handleDeletePath}
        onDeleteIdea={handleDeleteIdea}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1 overflow-auto p-4">
          {selectedIdea ? (
            <LexicalComposer initialConfig={editorConfig}>
              <div className="editor-container">
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
                  <MarkdownShortcutPlugin transformers={TRANSFORMERS} />

                  <UpdateContentPlugin content={selectedIdea.content} ideaId={selectedIdea.id} />
                  <OnChangePlugin onChange={onChange} />
                </div>
              </div>
            </LexicalComposer>
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