"use client"
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelectedLayoutSegments } from 'next/navigation';
import type { UserProfile } from '@/lib/profile';
import { FolderPlus, Loader2 } from 'lucide-react';
import { ProjectShell } from '@/components/editor/project-shell';
import { SidebarCustom } from '@/components/editor/sidebar-custom';
import { Sidebar, SidebarContent, SidebarProvider } from '@/components/ui/sidebar';
import { countProjectTextStats, SIDEBAR_OPEN_STORAGE_KEY, CONNECTIONS_OPEN_STORAGE_KEY } from '@/app/editor/editor-utils';
import { useProjectEditorState } from '@/app/editor/[projectId]/hooks/useProjectEditorState';
import { EditorTitleSlot, EditorActions } from '@/app/editor/[projectId]/components/EditorHeader';
import { WriteView } from '@/app/editor/[projectId]/components/WriteView';
import { startExistingProject } from '@/lib/projects-store';
import { TaskHint } from '@/components/editor/task-hint';
import { GraphView } from '@/components/editor/graph-view';

export function EditorWorkspace({ user }: { user: Pick<UserProfile, 'userId' | 'username' | 'imageUrl'> }) {
  const segments = useSelectedLayoutSegments();
  const routeProjectId = segments[0];
  return routeProjectId ? <ProjectEditor routeProjectId={routeProjectId} user={user} /> : null;
}

export function ProjectEditor({ routeProjectId, user }: { routeProjectId: string; user: Pick<UserProfile, 'userId' | 'username' | 'imageUrl'> }) {
  const workspaceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      workspaceRef.current?.style.setProperty('--editor-viewport-height', `${viewport.height}px`);
      if (workspaceRef.current) workspaceRef.current.dataset.keyboardOpen = String(viewport.height < window.innerHeight * 0.75);
    };
    resize();
    viewport.addEventListener('resize', resize);
    return () => viewport.removeEventListener('resize', resize);
  }, []);

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(
    () => { try { return typeof window === 'undefined' || localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY) !== 'false'; } catch { return true; } }
  );
  const [connectionsPanelOpen, setConnectionsPanelOpen] = useState(
    () => { try { return typeof window !== 'undefined' && localStorage.getItem(CONNECTIONS_OPEN_STORAGE_KEY) === 'true'; } catch { return false; } }
  );
  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, String(leftSidebarOpen)); } catch {}
  }, [leftSidebarOpen]);
  useEffect(() => {
    try { localStorage.setItem(CONNECTIONS_OPEN_STORAGE_KEY, String(connectionsPanelOpen)); } catch {}
  }, [connectionsPanelOpen]);
  useEffect(() => {
    const blockSidebarShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'b') return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.closest?.('[contenteditable="true"], input, textarea')) return;
      event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', blockSidebarShortcut, true);
    return () => window.removeEventListener('keydown', blockSidebarShortcut, true);
  }, []);

  const project = useProjectEditorState(routeProjectId, connectionsPanelOpen, user);
  const projectId = project.projectId;
  useEffect(() => {
    if (project.loaded) document.title = `${project.projectTitle} | Tramo`;
  }, [project.loaded, project.projectTitle]);

  const textStats = useMemo(
    () => countProjectTextStats(project.items),
    [project.items]
  );

  const startingRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const startWriting = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setStartError('');
    try {
      const result = await startExistingProject(projectId, project.activeTrailId, project.restoreEpoch);
      window.location.assign(`/editor/${result.projectId}?note=${result.itemId}&trail=${result.trailId ?? ''}&write=1`);
    } catch {
      setStartError('Could not open a note. Please try again.');
      startingRef.current = false;
      setStarting(false);
    }
  };

  const emptyState = (
    <div className="flex h-full w-full min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-popover text-center text-muted-foreground">
      <FolderPlus className="h-12 w-12 opacity-40" />
      <p className="text-lg font-medium">{project.activeTrail ? project.activeTrail.title : 'Start with a note'}</p>
      <p className="max-w-sm text-sm">Write first. A trail is an ordered sequence of notes; you can organize and reuse them as you go.</p>
      <button type="button" disabled={starting} onClick={startWriting} className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground disabled:opacity-50">{starting ? 'Opening…' : 'Start writing'}</button>
      {startError && <p role="alert" className="text-sm text-destructive">{startError}</p>}
    </div>
  );

  return (
    <SidebarProvider
      ref={workspaceRef}
      open={leftSidebarOpen}
      onOpenChange={setLeftSidebarOpen}
      style={{ "--sidebar-width": "288px", "--sidebar-width-icon": "272px" } as React.CSSProperties}
      className="editor-workspace h-dvh min-h-0"
    >
      <ProjectShell
        homeHref="/projects"
        showLogo={false}
        titleSlot={
          project.loaded ? <EditorTitleSlot
            projectTitle={project.projectTitle}
            draft={project.isDraft}
            onDraftTitleChange={project.onDraftProjectTitle}
            onRenameProject={project.handleRenameProject}
            saveStatus={project.saveStatus}
            saveError={project.isDraft ? '' : project.saveError}
            onDiscardRecoveredChanges={project.onDiscardRecoveredChanges}
            onKeepRecoveredChanges={project.onKeepRecoveredChanges}
          /> : <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        }
        actions={
          project.loaded && <EditorActions
            disabled={project.isDraft}
            restoreEpoch={project.restoreEpoch}
            textStats={textStats}
            projectId={projectId}
            beforeExport={async () => {
              if (!await project.flushPendingContent()) throw new Error('Could not save note content. Wait for image uploads to finish or retry before exporting.');
              try { await project.flushProjectChanges(); }
              catch { throw new Error('Could not save project changes. Retry the failed edit or refresh the project before exporting.'); }
              if (!await project.flushPendingContent()) throw new Error('Some note changes are still unsaved. Please try again.');
            }}
            profile={project.profile}
          />
        }
        sidebar={
          project.loaded ? <SidebarCustom
            homeHref="/projects"
            draft={project.isDraft}
            onDraftTrailTitleChange={project.onDraftTrailTitle}
            onDraftItemTitleChange={project.onDraftItemTitle}
            projectId={projectId}
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
            onDeleteItem={async (itemId) => { await project.handleDeleteItem(itemId); project.discardItem(itemId); }}
            onReorderTrailItems={project.handleReorderTrailItems}
            onReorderTrails={project.handleReorderTrails}
            trailOrderError={project.trailOrderError}
            onMoveItemToTrail={project.handleMoveItemToTrail}
          /> : <Sidebar><SidebarContent><div className="m-6 h-5 w-32 animate-pulse rounded bg-muted" /></SidebarContent></Sidebar>
        }
        content={
          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden">
            <h1 className="sr-only">{project.projectTitle || 'Untitled project'}</h1>
            {project.draftError && <div role="alert" className="flex items-center gap-2 text-sm text-destructive">{project.draftError}<button type="button" className="underline" onClick={project.retryDraft}>Retry</button></div>}
            {project.titleSaveError && <div role="alert" className="flex items-center gap-2 text-sm text-destructive">{project.titleSaveError}<button type="button" className="underline" onClick={project.retryItemTitles}>Retry</button></div>}
            {project.loaded && project.profile && project.selectedItem && <TaskHint id={`${project.profile?.username ?? projectId}:${project.trails.length > 1 ? 'reuse' : Object.keys(project.items).length > 1 ? 'connect' : 'write'}`}>
              {project.trails.length > 1 ? 'Reuse a note with “Add existing note” in another trail. Edits appear everywhere that note is used.' : Object.keys(project.items).length > 1 ? 'Mention another note with @, or connect notes in the map.' : 'Start writing in the note. Your changes save automatically; you can add a title later.'}
            </TaskHint>}
            <div className="relative flex min-h-0 min-w-0 flex-1 gap-3 overflow-hidden">
            {!project.loaded ? <div className="editor-container flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground" role="status"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" />Loading editor…</div> : <>
            {project.view === 'graph' && (
              <GraphView
                projectId={projectId}
                graphColors={project.graphColors}
                onSaveColors={project.handleSetGraphColors}
                trails={project.trails}
                items={project.items}
                mapPreviews={project.mapPreviews}
                onRetryMapPreviews={project.retryMapPreviews}
                activeTrailId={project.activeTrailId}
                selectedItemId={project.selectedItemId}
                onSelectItem={project.handleSelectItem}
                onClose={() => project.setView('write')}
              />
            )}
            <div className={project.view === 'graph' ? 'hidden' : 'editor-write-layout flex min-h-0 min-w-0 flex-1 gap-3 overflow-hidden'} inert={project.view === 'graph'}>
            {project.selectedItem ? (
              <WriteView
                draft={project.isDraft}
                onDraftTitleChange={project.onDraftItemTitle}
                resolveProjectId={project.resolveProjectId}
                active={project.view === 'write'}
                projectId={projectId}
                item={project.selectedItem}
                items={project.items}
                mapPreviews={project.mapPreviews}
                onRetryMapPreviews={project.retryMapPreviews}
                trails={project.trails}
                graphColors={project.graphColors}
                activeTrailId={project.activeTrailId}
                trail={project.activeTrail}
                reorderNotice={project.activeTrailId ? project.reorderNotices[project.activeTrailId] : undefined}
                onDismissReorderNotice={() => { if (project.activeTrailId) project.dismissReorderNotice(project.activeTrailId); }}
                contentLoadError={project.contentLoadError}
                onRetryContent={project.retryContent}
                navigationRequest={project.navigationRequest}
                onVisibleItem={project.handleVisibleItem}
                onSelectTrail={project.handleSelectTrail}
                onCommitTitle={project.commitItemTitle}
                onSetTitleAlign={project.handleSetItemTitleAlign}
                onSelectItem={project.handleSelectItem}
                onCreateItem={project.handleCreateItem}
                onOpenGraph={() => project.setView('graph')}
                onChange={project.onChange}
                extractionActions={{
                  restoreEpoch: project.restoreEpoch,
                  beforeExtract: async (id, state) => {
                    project.onChange(id, state);
                    if (!await project.flushPendingContent()) throw new Error('Could not save note content. Your selection is kept; wait for image uploads or retry.');
                    try { await project.flushProjectChanges(); }
                    catch { throw new Error('Could not save project changes. Your selection is kept; retry the failed edit before extracting.'); }
                    if (!await project.flushPendingContent()) throw new Error('Some note changes are still unsaved. Please try again.');
                  },
                  pauseItem: project.pauseItem,
                  resumeItem: project.resumeItem,
                  acceptPersistedItem: project.acceptPersistedItem,
                  onExtracted: project.applyExtraction,
                }}
                connectionsPanelOpen={!project.isDraft && connectionsPanelOpen}
                onToggleConnectionsPanelOpen={() => setConnectionsPanelOpen((o) => !o)}
              />
             ) : emptyState}
            </div>
            </>}
            </div>
          </div>
        }
      />
    </SidebarProvider>
  )
}
