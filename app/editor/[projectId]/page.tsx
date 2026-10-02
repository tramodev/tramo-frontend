
"use client"
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { FolderPlus } from 'lucide-react';
import { ProjectShell } from '@/components/editor/project-shell';
import { SidebarCustom } from '@/components/editor/sidebar-custom';
import { ShortcutsDialog } from '@/components/editor/shortcuts-dialog';
import { Sidebar, SidebarContent, SidebarProvider } from '@/components/ui/sidebar';
import { countProjectTextStats, SIDEBAR_OPEN_STORAGE_KEY, CONNECTIONS_OPEN_STORAGE_KEY } from '../editor-utils';
import { useProjectEditorState } from './hooks/useProjectEditorState';
import { useAutoSave } from './hooks/useAutoSave';
import { useEditorTour } from './hooks/useEditorTour';
import { EditorTitleSlot, EditorActions } from './components/EditorHeader';
import { WriteView } from './components/WriteView';
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

  useEditorTour(project.loaded && !!project.selectedItem);

  const emptyState = (
    <div className="flex h-full w-full min-h-[60vh] flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-popover text-center text-muted-foreground">
      <FolderPlus className="h-12 w-12 opacity-40" />
      <p className="text-lg font-medium">
        {project.trails.length === 0 ? "No trails yet" : "No item selected"}
      </p>
      <p className="max-w-sm text-sm">
        {project.trails.length === 0
          ? 'Create a trail from the sidebar (the "+" next to "Trails") to get started.'
          : "Select an item from the sidebar, or create a new one inside a trail."}
      </p>
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
          <div className="flex min-w-0 flex-1 gap-3 overflow-hidden">
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
                associationById={project.associationById}
                contentLoadError={project.contentLoadError}
                onRetryContent={project.retryContent}
                navigationRequest={project.navigationRequest}
                onVisibleItem={project.handleVisibleItem}
                onUpdateAnnotation={project.handleUpdateAnnotation}
                onCommitTitle={project.commitItemTitle}
                onSetTitleAlign={project.handleSetItemTitleAlign}
                onSelectItem={project.handleSelectItem}
                onCreateItem={project.handleCreateItem}
                onLinkItems={project.handleLinkItems}
                onTie={project.handleTie}
                onUntie={project.handleUntie}
                onOpenGraph={() => project.setView('graph')}
                onChange={autoSave.onChange}
                connectionsPanelOpen={connectionsPanelOpen}
                onToggleConnectionsPanelOpen={() => setConnectionsPanelOpen((o) => !o)}
              />
            ) : emptyState}
          </div>
        }
      />
      <ShortcutsDialog />
    </SidebarProvider>
  )
}
