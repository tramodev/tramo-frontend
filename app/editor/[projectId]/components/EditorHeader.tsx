// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserMenu } from '@/components/layout/user-menu';
import { ExportProjectButton } from '@/components/editor/export-project-button';
import { ProjectHistorySheet } from '@/components/editor/project-history-sheet';
import { PROJECT_TEXT_MAX_LENGTH } from '@/lib/project-validation';
import type { SaveStatus } from '../hooks/useAutoSave';

interface EditorTitleSlotProps {
  projectTitle: string;
  onRenameProject: (title: string) => Promise<void>;
  saveStatus: SaveStatus;
  saveError: string;
}

export function EditorTitleSlot({ projectTitle, onRenameProject, saveStatus, saveError }: EditorTitleSlotProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [titleError, setTitleError] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const renaming = useRef(false);

  const startEditTitle = () => {
    setEditingTitleValue(projectTitle);
    setIsEditingTitle(true);
    setTitleError('');
  };

  const submitEditTitle = async () => {
    if (renaming.current) return;
    const title = editingTitleValue.trim();
    if (!title || title === projectTitle) {
      setIsEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    renaming.current = true;
    try {
      await onRenameProject(title);
      setIsEditingTitle(false);
      setTitleError('');
    } catch (failure) {
      setTitleError(failure instanceof Error ? failure.message : 'Could not rename project. Try again.');
    } finally {
      setSavingTitle(false);
      renaming.current = false;
    }
  };

  if (isEditingTitle) {
    return (
      <div>
        <Input
          autoFocus
          maxLength={PROJECT_TEXT_MAX_LENGTH}
          disabled={savingTitle}
          onFocus={(event) => event.currentTarget.select()}
          value={editingTitleValue}
          className="h-8 max-w-xs"
          onChange={(e) => setEditingTitleValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitEditTitle();
            if (e.key === 'Escape') setIsEditingTitle(false);
          }}
          onBlur={submitEditTitle}
        />
        {titleError && <p role="alert" className="text-xs text-destructive">{titleError}</p>}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-4">
      <span
        data-tour="editor-title"
        className="min-w-0 truncate cursor-text text-[0.9375rem] font-medium decoration-dotted underline-offset-4 hover:underline"
        onDoubleClick={startEditTitle}
        title="Double-click to rename"
      >
        {projectTitle}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground w-[60px]">
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
      {saveStatus === 'error' && saveError && <span role="alert" className="max-w-sm text-xs text-destructive">{saveError}</span>}
    </div>
  );
}

interface EditorActionsProps {
  textStats: { words: number; characters: number } | null;
  projectId: string;
  beforeExport: () => Promise<void>;
  restoreEpoch: number;
  profile: { username: string; imageUrl: string | null } | null;
}

export function EditorActions({
  textStats,
  projectId,
  profile,
  beforeExport,
  restoreEpoch,
}: EditorActionsProps) {
  return (
    <>
      {textStats ? (
        <span className="text-xs text-muted-foreground" title="Total for the project">
          {textStats.words} words · {textStats.characters} characters
        </span>
      ) : <span className="text-xs text-muted-foreground" role="status">Counting project…</span>}
      <ExportProjectButton projectId={projectId} beforeExport={beforeExport} />
      <ProjectHistorySheet projectId={projectId} restoreEpoch={restoreEpoch} beforeSave={beforeExport} />
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
