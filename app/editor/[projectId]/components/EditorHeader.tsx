// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, Loader2, Route, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserMenu } from '@/components/layout/user-menu';
import { ExportProjectButton } from '@/components/editor/export-project-button';
import { VersionHistorySheet } from '@/components/editor/version-history-sheet';
import type { SaveStatus } from '../hooks/useAutoSave';

interface EditorTitleSlotProps {
  projectTitle: string;
  onRenameProject: (title: string) => void;
  saveStatus: SaveStatus;
}

export function EditorTitleSlot({ projectTitle, onRenameProject, saveStatus }: EditorTitleSlotProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  const startEditTitle = () => {
    setEditingTitleValue(projectTitle);
    setIsEditingTitle(true);
  };

  const submitEditTitle = () => {
    const title = editingTitleValue.trim();
    setIsEditingTitle(false);
    if (!title || title === projectTitle) return;
    onRenameProject(title);
  };

  if (isEditingTitle) {
    return (
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
    );
  }

  return (
    <div className="flex gap-4">
      <span
        data-tour="editor-title"
        className="cursor-text text-[15px] font-medium decoration-dotted underline-offset-4 hover:underline"
        onDoubleClick={startEditTitle}
        title="Double-click to rename"
      >
        {projectTitle}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground w-[60px]">
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
  );
}

interface EditorActionsProps {
  textStats: { words: number; characters: number } | null;
  hasActiveTrail: boolean;
  overviewActive: boolean;
  onToggleOverview: () => void;
  projectId: string;
  beforeExport: () => Promise<void>;
  profile: { username: string; imageUrl: string | null } | null;
}

export function EditorActions({
  textStats,
  hasActiveTrail,
  overviewActive,
  onToggleOverview,
  projectId,
  profile,
  beforeExport,
}: EditorActionsProps) {
  return (
    <>
      {textStats ? (
        <span className="text-xs text-muted-foreground" title="Total for the project">
          {textStats.words} words · {textStats.characters} characters
        </span>
      ) : <span className="text-xs text-muted-foreground" role="status">Counting project…</span>}
      {hasActiveTrail && (
        <Button
          data-tour="overview-toggle"
          variant={overviewActive ? 'secondary' : 'ghost'}
          size="icon"
          onClick={onToggleOverview}
          title="Overview"
          aria-label="Overview"
          aria-pressed={overviewActive}
        >
          <Route className="h-[15px] w-[15px]" />
        </Button>
      )}
      <ExportProjectButton projectId={projectId} beforeExport={beforeExport} />
      <VersionHistorySheet projectId={projectId} />
      <Button data-tour="share" variant="secondary" size="lg" asChild>
        <Link href={`/projects/${projectId}/share`}>
          <Share2 className="h-[15px] w-[15px]" />
          Publish &amp; Share
        </Link>
      </Button>
      <UserMenu loggedIn={!!profile} username={profile?.username ?? null} imageUrl={profile?.imageUrl ?? null} />
    </>
  );
}
