// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FolderPlus, Loader2, Type } from 'lucide-react';
import { ProjectShell } from '@/components/editor/project-shell';
import { SidebarCustom } from '@/components/editor/sidebar-custom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { TaskHint } from '@/components/editor/task-hint';
import { GraphView } from '@/components/editor/graph-view';
import { EmbedErrorsStatus } from '@/components/editor/embed-errors-status';
import { countProjectTextStats, SIDEBAR_OPEN_STORAGE_KEY, CONNECTIONS_OPEN_STORAGE_KEY } from '@/app/editor/editor-utils';
import { EditorTitleSlot } from '@/app/editor/[projectId]/components/EditorHeader';
import { WriteView } from '@/app/editor/[projectId]/components/WriteView';
import { usePlaygroundProject } from '@/app/playground/use-playground-project';
import { playgroundEditorHref } from '@/app/playground/playground-import';
import { useMounted } from '@/hooks/use-mounted';

const NO_MAP_PREVIEWS = {};
const noop = () => {};
const IMAGES_NEED_ACCOUNT = 'Create an account to add images.';
const imagesNeedAccount = () => Promise.reject(new Error(IMAGES_NEED_ACCOUNT));
const extractionActions = { beforeExtract: async () => {}, onExtracted: noop };

export function PlaygroundEditor({ loggedIn }: { loggedIn: boolean }) {
  const mounted = useMounted();
  if (!mounted) return <div className="flex h-dvh items-center justify-center gap-3 text-sm text-muted-foreground" role="status"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />Loading editor…</div>;
  return <PlaygroundWorkspace loggedIn={loggedIn} />;
}

function PlaygroundWorkspace({ loggedIn }: { loggedIn: boolean }) {
  const [saving, setSaving] = useState(false);
  const [saveToAccountError, setSaveToAccountError] = useState('');
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const formattingTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      workspaceRef.current?.style.setProperty('--editor-viewport-height', `${viewport.height}px`);
      if (workspaceRef.current) {
        workspaceRef.current.dataset.keyboardOpen = String(viewport.height < window.innerHeight * 0.75);
        workspaceRef.current.dataset.shortViewport = String(viewport.width <= 1023 && viewport.height <= 400);
      }
    };
    resize();
    viewport.addEventListener('resize', resize);
    return () => viewport.removeEventListener('resize', resize);
  }, []);

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(() => { try { return localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY) !== 'false'; } catch { return true; } });
  const [connectionsPanelOpen, setConnectionsPanelOpen] = useState(() => { try { return localStorage.getItem(CONNECTIONS_OPEN_STORAGE_KEY) === 'true'; } catch { return false; } });
  const [writeRevealed, setWriteRevealed] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, String(leftSidebarOpen)); } catch {}
  }, [leftSidebarOpen]);
  useEffect(() => {
    try { localStorage.setItem(CONNECTIONS_OPEN_STORAGE_KEY, String(connectionsPanelOpen)); } catch {}
  }, [connectionsPanelOpen]);

  const project = usePlaygroundProject();
  const textStats = useMemo(() => countProjectTextStats(project.items), [project.items]);
  useEffect(() => {
    document.title = `${project.projectTitle} | Tramo`;
  }, [project.projectTitle]);

  const emptyState = (
    <div className="flex h-full w-full min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-popover text-center text-muted-foreground">
      <FolderPlus className="h-12 w-12 opacity-40" />
      <p className="text-lg font-medium">{project.activeTrail ? project.activeTrail.title : 'Start with a note'}</p>
      <p className="max-w-sm text-sm">Write first. A trail is an ordered sequence of notes; you can organize and reuse them as you go.</p>
      <button type="button" onClick={() => project.activeTrailId ? project.handleCreateItem(project.activeTrailId, '') : project.handleCreateLooseItem('')} className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">Start writing</button>
    </div>
  );

  return (
    <SidebarProvider
      ref={workspaceRef}
      onKeyDown={event => {
        if (event.key !== 'Escape' || !toolbarOpen || workspaceRef.current?.dataset.shortViewport !== 'true') return;
        if ((event.target as HTMLElement).closest('[role="menu"], [role="dialog"], [role="listbox"]')) return;
        event.preventDefault();
        event.stopPropagation();
        setToolbarOpen(false);
        requestAnimationFrame(() => formattingTriggerRef.current?.focus());
      }}
      open={leftSidebarOpen}
      onOpenChange={setLeftSidebarOpen}
      style={{ "--sidebar-width": "18rem" } as React.CSSProperties}
      className="editor-workspace h-dvh min-h-0"
    >
      <ProjectShell
        homeHref="/"
        showLogo={false}
        titleSlot={
          <EditorTitleSlot
            projectTitle={project.projectTitle}
            onRenameProject={project.handleRenameProject}
            saveStatus={project.saveStatus}
            saveError={project.saveError}
          />
        }
        actions={<>
          {project.view === 'write' && project.selectedItem && <button ref={formattingTriggerRef} type="button" className="editor-toolbar-toggle size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground hover:bg-accent" aria-label={toolbarOpen ? 'Close formatting' : 'Formatting'} title="Formatting" aria-expanded={toolbarOpen} aria-controls="editor-formatting-toolbar" onClick={() => setToolbarOpen(open => !open)}>
            <Type className="size-4" />
          </button>}
          <EmbedErrorsStatus items={project.items} onReview={error => {
            const item = project.items[error.itemId];
            if (item) project.handleSelectItem(item, undefined, error.index);
          }} />
          {textStats && <span className="editor-word-count hidden text-xs text-muted-foreground md:inline" title="Total for the project">
            {textStats.words} words · {textStats.characters} characters
          </span>}
          {saveToAccountError && <span role="alert" className="max-w-48 text-xs text-destructive">{saveToAccountError}</span>}
          {loggedIn ? <Button size="lg" disabled={saving} onClick={() => {
            setSaving(true);
            setSaveToAccountError('');
            project.saveToAccount().then(result => window.location.assign(playgroundEditorHref(result)), (error: unknown) => {
              setSaveToAccountError(error instanceof Error ? error.message : 'Could not save the playground.');
              setSaving(false);
            });
          }}>{saving ? 'Saving…' : 'Save to my projects'}</Button> : <Button asChild size="lg">
            <Link href="/signup">Sign up to save</Link>
          </Button>}
        </>}
        sidebar={
          <SidebarCustom
            homeHref="/"
            projectId={project.projectId}
            trails={project.trails}
            items={project.items}
            selectedItemId={project.selectedItemId}
            activeTrailId={project.activeTrailId}
            onSelectItem={project.handleSelectItem}
            onCreateTrail={project.handleCreateTrail}
            onCreateItem={project.handleCreateItem}
            onCreateLooseItem={project.handleCreateLooseItem}
            onLinkItemToTrail={project.handleLinkItemToTrail}
            onRenameTrail={project.handleRenameTrail}
            onRenameItem={project.handleRenameItem}
            onDeleteTrail={project.handleDeleteTrail}
            onUnlinkItemFromTrail={project.handleUnlinkItemFromTrail}
            onDeleteItem={project.handleDeleteItem}
            onReorderTrailItems={project.handleReorderTrailItems}
            onReorderTrails={project.handleReorderTrails}
            onMoveItemToTrail={project.handleMoveItemToTrail}
            searchItems={project.searchItems}
          />
        }
        content={
          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden">
            <h1 className="sr-only">{project.projectTitle || 'Untitled project'}</h1>
            <div className="relative flex min-h-0 min-w-0 flex-1 gap-3 overflow-hidden">
            {project.view !== 'graph' && !!project.selectedItem && !writeRevealed && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground" role="status"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />Loading editor…</div>}
            {project.view === 'graph' && (
              <GraphView
                projectId={project.projectId}
                graphColors={project.graphColors}
                onSaveColors={project.handleSetGraphColors}
                trails={project.trails}
                items={project.items}
                mapPreviews={NO_MAP_PREVIEWS}
                activeTrailId={project.activeTrailId}
                selectedItemId={project.selectedItemId}
                onSelectItem={project.handleSelectItem}
                onClose={() => project.setView('write')}
              />
            )}
            <div className={project.view === 'graph' ? 'hidden' : 'editor-write-layout flex min-h-0 min-w-0 flex-1 gap-3 overflow-hidden'} inert={project.view === 'graph'}>
            {project.selectedItem ? (
              <WriteView
                toolbarOpen={toolbarOpen}
                hint={<TaskHint id="playground:write">
                  This is a playground: your notes stay in this browser. {loggedIn ? 'Save them to your projects to keep and publish them.' : 'Sign up to save them to an account and publish them.'}
                </TaskHint>}
                onDraftTitleChange={project.handleRenameItem}
                resolveProjectId={imagesNeedAccount}
                imagesUnavailable={IMAGES_NEED_ACCOUNT}
                active={project.view === 'write'}
                projectId={project.projectId}
                item={project.selectedItem}
                items={project.items}
                mapPreviews={NO_MAP_PREVIEWS}
                onRetryMapPreviews={noop}
                trails={project.trails}
                graphColors={project.graphColors}
                activeTrailId={project.activeTrailId}
                trail={project.activeTrail}
                onDismissReorderNotice={noop}
                contentLoadError={false}
                onRevealChange={setWriteRevealed}
                onRetryContent={noop}
                navigationRequest={project.navigationRequest}
                onVisibleItem={project.handleVisibleItem}
                onSelectTrail={project.handleSelectTrail}
                onCommitTitle={project.commitItemTitle}
                onSetTitleAlign={project.handleSetItemTitleAlign}
                onSelectItem={project.handleSelectItem}
                onCreateItem={project.handleCreateItem}
                onOpenGraph={() => project.setView('graph')}
                onChange={project.onChange}
                extractionActions={extractionActions}
                connectionsPanelOpen={connectionsPanelOpen}
                onToggleConnectionsPanelOpen={() => setConnectionsPanelOpen(open => !open)}
              />
            ) : emptyState}
            </div>
            </div>
          </div>
        }
      />
    </SidebarProvider>
  )
}
