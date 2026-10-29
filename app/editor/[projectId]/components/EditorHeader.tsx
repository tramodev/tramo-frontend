// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { UserMenu } from '@/components/layout/user-menu';
import { EmbedErrorsStatus } from '@/components/editor/embed-errors-status';
import type { ProjectEmbedError } from '@/lib/project-embed-errors';
import type { Item } from '@/app/editor/types';
import { ExportProjectButton } from '@/components/editor/export-project-button';
import { ProjectHistorySheet } from '@/components/editor/project-history-sheet';
import { PROJECT_TEXT_MAX_LENGTH } from '@/lib/project-validation';
import type { SaveStatus } from '../hooks/useAutoSave';

interface EditorTitleSlotProps {
  draft?: boolean;
  onDraftTitleChange?: (title: string) => void;
  projectTitle: string;
  onRenameProject: (title: string) => Promise<void>;
  saveStatus: SaveStatus;
  saveError: string;
  onDiscardRecoveredChanges?: () => void;
  onKeepRecoveredChanges?: () => Promise<void>;
}

export function EditorTitleSlot({ projectTitle, onRenameProject, saveStatus, saveError, draft, onDraftTitleChange, onDiscardRecoveredChanges, onKeepRecoveredChanges }: EditorTitleSlotProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [discardRecoveryOpen, setDiscardRecoveryOpen] = useState(false);
  const [keepRecoveryOpen, setKeepRecoveryOpen] = useState(false);
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
          placeholder="Untitled project"
          className="h-8 max-w-xs"
          onChange={(e) => { setEditingTitleValue(e.target.value); onDraftTitleChange?.(e.target.value); }}
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
    <div className="editor-project-title flex min-w-0 flex-wrap items-center gap-2">
      <button
        type="button"
        data-tour="editor-title"
        className={`min-h-6 min-w-0 truncate text-left text-[0.9375rem] font-medium decoration-dotted underline-offset-4 hover:underline ${draft && (!projectTitle || projectTitle === 'Untitled project') ? 'text-muted-foreground' : ''}`}
        onClick={startEditTitle}
        onDoubleClick={startEditTitle}
        aria-label={`Rename project: ${projectTitle || 'Untitled project'}`}
        title="Rename project"
      >
        {projectTitle || 'Untitled project'}
      </button>
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
      {saveStatus === 'error' && saveError && <span role="alert" className="basis-full text-xs text-destructive">{saveError}</span>}
      {onDiscardRecoveredChanges && <>
        {onKeepRecoveredChanges && <Button variant="outline" size="sm" onClick={() => setKeepRecoveryOpen(true)}>Keep my version</Button>}
        <Button variant="outline" size="sm" onClick={() => setDiscardRecoveryOpen(true)}>Use server version</Button>
        {onKeepRecoveredChanges && <ConfirmDialog open={keepRecoveryOpen} onOpenChange={setKeepRecoveryOpen}
          title="Save your recovered version?"
          description="This replaces the server content of the conflicting notes with your recovered text, including your latest edits in this tab."
          confirmLabel="Keep my version" onConfirm={() => { void onKeepRecoveredChanges(); }} />}
        <ConfirmDialog open={discardRecoveryOpen} onOpenChange={setDiscardRecoveryOpen}
          title="Discard recovered changes?"
          description="Copy any recovered text you want to keep first. This removes the local backups for conflicting notes and reloads their server versions."
          confirmLabel="Use server version" onConfirm={onDiscardRecoveredChanges} />
      </>}
    </div>
  );
}

interface EditorActionsProps {
  items: Record<string, Item>;
  onReviewEmbed: (error: ProjectEmbedError) => void;
  disabled?: boolean;
  textStats: { words: number; characters: number } | null;
  projectId: string;
  beforeExport: () => Promise<void>;
  restoreEpoch: number;
  profile: { username: string; imageUrl: string | null } | null;
}

export function EditorActions({
  items,
  onReviewEmbed,
  textStats,
  projectId,
  profile,
  beforeExport,
  restoreEpoch,
  disabled,
}: EditorActionsProps) {
  return (
    <>
      <EmbedErrorsStatus key={`${projectId}:${restoreEpoch}`} items={items} onReview={onReviewEmbed} />
      {textStats ? (
        <span className="editor-word-count hidden text-xs text-muted-foreground md:inline" title="Total for the project">
          {textStats.words} words · {textStats.characters} characters
        </span>
      ) : <span className="editor-word-count hidden text-xs text-muted-foreground md:inline" role="status">Counting project…</span>}
      {!disabled && <ExportProjectButton projectId={projectId} beforeExport={beforeExport} />}
      {!disabled && <ProjectHistorySheet projectId={projectId} restoreEpoch={restoreEpoch} beforeSave={beforeExport} />}
      {disabled ? <Button variant="secondary" size="lg" disabled aria-label="Publish & Share project"><Share2 className="h-[15px] w-[15px]" /><span className="hidden sm:inline">Publish &amp; Share</span></Button> : <Button data-tour="share" variant="secondary" size="lg" asChild>
        <Link href={`/projects/${projectId}/share`} aria-label="Publish & Share project">
          <Share2 className="h-[15px] w-[15px]" />
          <span className="hidden sm:inline">Publish &amp; Share</span>
        </Link>
      </Button>}
      <UserMenu loggedIn={!!profile} username={profile?.username ?? null} imageUrl={profile?.imageUrl ?? null} />
    </>
  );
}
