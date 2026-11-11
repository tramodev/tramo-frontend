// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Globe, History, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserMenu } from '@/components/layout/user-menu';
import { EmbedErrorsStatus } from '@/components/editor/embed-errors-status';
import type { ProjectEmbedError } from '@/lib/project-embed-errors';
import type { Item } from '@/app/editor/types';
import { ExportProjectButton } from '@/components/editor/export-project-button';
import { ShareDialog } from '@/components/project/share-dialog';
import { PROJECT_TEXT_MAX_LENGTH } from '@/lib/project-validation';
import type { SaveStatus } from '../hooks/useAutoSave';

interface EditorTitleSlotProps {
  draft?: boolean;
  onDraftTitleChange?: (title: string) => void;
  projectTitle: string;
  onRenameProject: (title: string) => Promise<void>;
  saveStatus: SaveStatus;
  saveError: string;
  onCopyUnsyncedText?: () => Promise<void>;
  readOnly?: boolean;
}

export function EditorTitleSlot({ readOnly, projectTitle, onRenameProject, saveStatus, saveError, draft, onDraftTitleChange, onCopyUnsyncedText }: EditorTitleSlotProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [titleError, setTitleError] = useState('');
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
    renaming.current = true;
    setIsEditingTitle(false);
    setTitleError('');
    try {
      await onRenameProject(title);
    } catch (failure) {
      setEditingTitleValue(title);
      setTitleError(failure instanceof Error ? failure.message : 'Could not rename project. Try again.');
      setIsEditingTitle(true);
    } finally {
      renaming.current = false;
    }
  };

  if (isEditingTitle) {
    return (
      <div>
        <Input
          autoFocus
          maxLength={PROJECT_TEXT_MAX_LENGTH}
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

  if (readOnly) {
    return (
      <div className="editor-project-title flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate text-[0.9375rem] font-medium">{projectTitle || 'Untitled project'}</span>
        <span className="shrink-0 text-xs text-muted-foreground">View only</span>
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
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground min-w-[60px] whitespace-nowrap">
        {saveStatus === 'saving' && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving
          </>
        )}
        {(saveStatus === 'error' || saveStatus === 'unsaved') && (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            Not saved
          </>
        )}
      </span>
      {saveStatus === 'error' && saveError && <span role="alert" className="basis-full text-xs text-destructive">{saveError}</span>}
      {onCopyUnsyncedText && <div className="editor-recovery-actions flex basis-full flex-wrap gap-2">
        <Button variant="outline" size="sm" className="min-h-11" onClick={() => { void onCopyUnsyncedText().catch(() => {}); }}>Copy my text</Button>
      </div>}
    </div>
  );
}

interface EditorActionsProps {
  items: Record<string, Item>;
  onReviewEmbed: (error: ProjectEmbedError) => void;
  disabled?: boolean;
  textStats: { words: number; characters: number } | null;
  projectId: string;
  projectTitle: string;
  beforeExport: () => Promise<void>;
  restoreEpoch: number;
  profile: { username: string; imageUrl: string | null } | null;
  canShare?: boolean;
  canEdit?: boolean;
  presence?: ReactNode;
}

export function EditorActions({
  items,
  onReviewEmbed,
  textStats,
  projectId,
  projectTitle,
  profile,
  beforeExport,
  restoreEpoch,
  disabled,
  canShare = true,
  canEdit = true,
  presence,
}: EditorActionsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [historyError, setHistoryError] = useState('');
  const [shareOpen, setShareOpen] = useState(() => searchParams.get('share') === '1');
  useEffect(() => {
    if (searchParams.get('share') !== '1') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('share');
    window.history.replaceState(window.history.state, '', url);
  }, [searchParams]);
  return (
    <>
      <EmbedErrorsStatus key={`${projectId}:${restoreEpoch}`} items={items} onReview={onReviewEmbed} />
      {textStats ? (
        <span className="editor-word-count hidden text-xs text-muted-foreground md:inline" title="Total for the project">
          {textStats.words} words · {textStats.characters} characters
        </span>
      ) : <span className="editor-word-count hidden text-xs text-muted-foreground md:inline" role="status">Counting project…</span>}
      {!disabled && <ExportProjectButton projectId={projectId} beforeExport={beforeExport} />}
      {!disabled && canEdit && <>
        {historyError && <span role="alert" className="max-w-48 text-xs text-destructive">{historyError}</span>}
        <Button variant="ghost" size="icon" title="Version history" aria-label="Version history" onClick={() => {
          setHistoryError('');
          beforeExport().then(() => router.push(`/projects/${projectId}/history`), (failure: unknown) => setHistoryError(failure instanceof Error ? failure.message : 'Could not save project changes.'));
        }}><History className="h-[15px] w-[15px]" /></Button>
      </>}
      {presence}
      {canShare && <>
        <Button data-tour="share" variant="secondary" size="lg" className="project-share-button" disabled={disabled} aria-label="Share project" onClick={() => setShareOpen(true)}>
          <UserPlus className="h-[15px] w-[15px]" />
          <span className="hidden sm:inline">Share</span>
        </Button>
        {disabled ? <Button variant="secondary" size="lg" className="project-share-button" disabled aria-label="Publish project"><Globe className="h-[15px] w-[15px]" /><span className="hidden sm:inline">Publish</span></Button> : <Button variant="secondary" size="lg" className="project-share-button" asChild>
          <Link href={`/projects/${projectId}/publish`} aria-label="Publish project">
            <Globe className="h-[15px] w-[15px]" />
            <span className="hidden sm:inline">Publish</span>
          </Link>
        </Button>}
        {!disabled && <ShareDialog projectId={projectId} projectTitle={projectTitle} owner={profile} open={shareOpen} onOpenChange={setShareOpen} />}
      </>}
      <UserMenu loggedIn={!!profile} username={profile?.username ?? null} imageUrl={profile?.imageUrl ?? null} />
    </>
  );
}
