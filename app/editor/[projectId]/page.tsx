// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only

"use client"
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { FolderPlus } from 'lucide-react';
import { ProjectShell } from '@/components/editor/project-shell';
import { SidebarCustom } from '@/components/editor/sidebar-custom';
import { Sidebar, SidebarContent, SidebarProvider } from '@/components/ui/sidebar';
import { countProjectTextStats, SIDEBAR_OPEN_STORAGE_KEY, CONNECTIONS_OPEN_STORAGE_KEY } from '../editor-utils';
import { useProjectEditorState } from './hooks/useProjectEditorState';
import { useAutoSave } from './hooks/useAutoSave';
import { EditorTitleSlot, EditorActions } from './components/EditorHeader';
import { WriteView } from './components/WriteView';
import { startExistingProject } from '@/lib/projects-store';
import { TaskHint } from '@/components/editor/task-hint';
import { OverviewView } from '@/components/editor/overview-view';
import { GraphView } from '@/components/editor/graph-view';

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(
    () => typeof window === 'undefined' || localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY) !== 'false'
  );
  const [connectionsPanelOpen, setConnectionsPanelOpen] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(CONNECTIONS_OPEN_STORAGE_KEY) === 'true'
  );
  useEffect(() => {
    localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, String(leftSidebarOpen));
  }, [leftSidebarOpen]);
  useEffect(() => {
    localStorage.setItem(CONNECTIONS_OPEN_STORAGE_KEY, String(connectionsPanelOpen));
  }, [connectionsPanelOpen]);

  const project = useProjectEditorState(projectId);
  const autoSave = useAutoSave({
    contextId: project.activeTrailId,
    onOptimisticUpdate: project.updateItemContentLocally,
    redirectToLogin: project.redirectToLogin,
  });

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
      const result = await startExistingProject(projectId, project.activeTrailId);
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
      open={leftSidebarOpen}
      onOpenChange={setLeftSidebarOpen}
      style={{ "--sidebar-width": "288px", "--sidebar-width-icon": "272px" } as React.CSSProperties}
      className="h-screen min-h-0"
    >
      <ProjectShell
        homeHref="/projects"
        showLogo={false}
        titleSlot={
          project.loaded ? <EditorTitleSlot
            projectTitle={project.projectTitle}
            onRenameProject={project.handleRenameProject}
            saveStatus={autoSave.saveStatus}
          /> : <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        }
        actions={
          project.loaded && <EditorActions
            textStats={textStats}
            hasActiveTrail={!!project.activeTrail}
            overviewActive={project.view === 'overview'}
            onToggleOverview={() => project.setView((v) => (v === 'overview' ? 'write' : 'overview'))}
            projectId={projectId}
            beforeExport={async () => {
              if (!await autoSave.flushPendingContent()) throw new Error('Could not save note content. Wait for image uploads to finish or retry before exporting.');
              try { await project.flushProjectChanges(); }
              catch { throw new Error('Could not save project changes. Retry the failed edit or refresh the project before exporting.'); }
              if (!await autoSave.flushPendingContent()) throw new Error('Some note changes are still unsaved. Please try again.');
            }}
            profile={project.profile}
          />
        }
        sidebar={
          project.loaded ? <SidebarCustom
            homeHref="/projects"
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
            onDeleteItem={async (itemId) => { await project.handleDeleteItem(itemId); autoSave.discardItem(itemId); }}
            onReorderTrailItems={project.handleReorderTrailItems}
          /> : <Sidebar><SidebarContent><div className="m-6 h-5 w-32 animate-pulse rounded bg-muted" /></SidebarContent></Sidebar>
        }
        content={
          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden">
            {project.loaded && project.profile && project.selectedItem && <TaskHint id={`${project.profile?.username ?? projectId}:${project.trails.length > 1 ? 'reuse' : Object.keys(project.items).length > 1 ? 'connect' : 'write'}`}>
              {project.trails.length > 1 ? 'Reuse a note with “Add existing note” in another trail. Edits appear everywhere that note is used.' : Object.keys(project.items).length > 1 ? 'Connect notes when a relationship adds context. Open Connections beside the editor, or explore the Graph.' : 'Start writing in the note. Your changes save automatically; you can add a title later.'}
            </TaskHint>}
            <div className="relative flex min-h-0 min-w-0 flex-1 gap-3 overflow-hidden">
            {!project.loaded ? <div className="editor-container flex flex-1 items-center justify-center text-sm text-muted-foreground" role="status">Loading editor…</div> : project.view === 'graph' ? (
              <GraphView
                trails={project.trails}
                items={project.items}
                activeTrailId={project.activeTrailId}
                selectedItemId={project.selectedItemId}
                onSelectItem={project.handleSelectItem}
                onClose={() => project.setView('write')}
              />
            ) : project.view === 'overview' ? (
              <OverviewView
                trail={project.activeTrail}
                items={project.items}
                associationById={project.associationById}
                selectedItemId={project.selectedItemId}
                onSelectItem={project.handleSelectItem}
                onSetDescription={project.handleSetTrailDescription}
                onClose={() => project.setView('write')}
                emptyState={emptyState}
              />
            ) : project.selectedItem ? (
              <WriteView
                projectId={projectId}
                item={project.selectedItem}
                items={project.items}
                trails={project.trails}
                activeTrailId={project.activeTrailId}
                trail={project.activeTrail}
                reorderNotice={project.activeTrailId ? project.reorderNotices[project.activeTrailId] : undefined}
                onDismissReorderNotice={() => { if (project.activeTrailId) project.dismissReorderNotice(project.activeTrailId); }}
                contentLoadError={project.contentLoadError}
                onRetryContent={project.retryContent}
                navigationRequest={project.navigationRequest}
                onVisibleItem={project.handleVisibleItem}
                onSelectTrail={project.handleSelectTrail}
                onUpdateAnnotation={project.handleUpdateAnnotation}
                onCommitTitle={project.commitItemTitle}
                onSetTitleAlign={project.handleSetItemTitleAlign}
                onSelectItem={project.handleSelectItem}
                onCreateItem={project.handleCreateItem}
                onTie={project.handleTie}
                onUntie={project.handleUntie}
                onOpenGraph={() => project.setView('graph')}
                onChange={autoSave.onChange}
                extractionActions={{
                  beforeExtract: async (id, state) => {
                    autoSave.onChange(id, state);
                    if (!await autoSave.flushPendingContent()) throw new Error('Could not save note content. Your selection is kept; wait for image uploads or retry.');
                    try { await project.flushProjectChanges(); }
                    catch { throw new Error('Could not save project changes. Your selection is kept; retry the failed edit before extracting.'); }
                    if (!await autoSave.flushPendingContent()) throw new Error('Some note changes are still unsaved. Please try again.');
                  },
                  pauseItem: autoSave.pauseItem,
                  resumeItem: autoSave.resumeItem,
                  acceptPersistedItem: autoSave.acceptPersistedItem,
                  onExtracted: project.applyExtraction,
                }}
                connectionsPanelOpen={connectionsPanelOpen}
                onToggleConnectionsPanelOpen={() => setConnectionsPanelOpen((o) => !o)}
              />
            ) : emptyState}
            </div>
          </div>
        }
      />
    </SidebarProvider>
  )
}
