// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ChevronLeft,
  Check,
  Copy,
  Globe,
  Loader2,
  Lock,
  Users,
} from "lucide-react"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mark } from "@/components/layout/logo"
import { SharePreview } from "@/components/project/share-preview"
import { TagsField } from "@/components/project/tags-field"
import { ThumbnailPicker } from "@/components/project/thumbnail-picker"
import {
  getProject,
  setProjectVisibility,
  setProjectDescription,
  setProjectTags,
  publishProject,
  type Project,
  type ProjectVisibility,
} from "@/lib/projects-store"
import { getMyProfile } from "@/lib/profile"
import type { ProjectFeedItem } from "@/lib/public-project"
import { TaskHint } from "@/components/editor/task-hint"
import { cn } from "@/lib/utils"
import { createPendingSaves } from "@/lib/pending-saves"
import { assertProjectText, PROJECT_TEXT_MAX_LENGTH } from "@/lib/project-validation"

const VISIBILITY_OPTIONS: {
  value: ProjectVisibility;
  label: string;
  description: string;
  icon: typeof Lock;
}[] = [
  { value: "private", label: "Private", description: "Only you can access this project", icon: Lock },
  { value: "unlisted", label: "Unlisted", description: "Anyone with the link can view it", icon: Users },
  { value: "published", label: "Published", description: "Listed on Explore for everyone", icon: Globe },
];

export default function PublishPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingSaves = useRef(createPendingSaves());
  const [profile, setProfile] = useState<{ username: string; imageUrl: string | null; selectedBadge: string | null } | null>(null);

  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [thumbnailImageUrl, setThumbnailImageUrl] = useState<string | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProject(projectId).then((p) => {
      if (cancelled) return;
      if (!p) return;
      setProject(p);
      setDescription(p.description);
      setTags(p.tags);
      setVisibility(p.visibility);
      setThumbnailImageUrl(p.thumbnailImageUrl);
    }).catch(() => {
      if (!cancelled) setError("Could not load this project.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    getMyProfile().then((p) => {
      if (!cancelled && p) setProfile({ username: p.username, imageUrl: p.imageUrl, selectedBadge: p.selectedBadge });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [projectId]);

  if (!project) return <main id="main-content" tabIndex={-1} className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
    {loading ? <p role="status">Loading project…</p> : <>
      <p role="alert">{error || "Project not found or unavailable."}</p>
      <Link href="/projects" className="text-primary underline">Back to projects</Link>
    </>}
  </main>;

  const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
  const confirmLabel =
    visibility !== "published" ? "save" : project.visibility === "published" ? "update" : "publish";

  const yourCard: ProjectFeedItem = {
    id: project.id,
    title: project.title,
    description: description || null,
    ownerUsername: profile?.username ?? "you",
    ownerAvatar: profile?.imageUrl ?? null,
    ownerBadge: profile?.selectedBadge ?? null,
    thumbnailImageUrl,
    tags: tagList,
    modifiedDate: project.updatedAt,
    publishedDate: project.visibility === "private" ? null : project.updatedAt,
    lastPublishedDate: null,
    voteCount: 0,
    votedByRequester: false,
    bookmarkedByRequester: false,
    viewCount: 0,
    forkCount: 0,
    commentCount: 0,
    featured: false,
    forkedFromProjectId: project.forkedFromProjectId,
    forkedFromTitle: project.forkedFromTitle,
    forkedFromOwnerUsername: project.forkedFromOwnerUsername,
    canFork: true,
  };

  const submitDescription = async () => {
    const next = description.trim();
    if (next === project.description) return;
    assertProjectText(next, 'description');
    await pendingSaves.current.track('description', async () => {
      await setProjectDescription(projectId, next, project.restoreEpoch);
      setProject(previous => previous && { ...previous, description: next });
    }, true);
  };

  const submitTags = async () => {
    const next = tags.trim();
    if (next === project.tags) return;
    await pendingSaves.current.track('tags', async () => {
      await setProjectTags(projectId, next, project.restoreEpoch);
      setProject(previous => previous && { ...previous, tags: next });
    }, true);
  };

  const changeVisibility = (next: ProjectVisibility) => {
    if (next === visibility || isPublishing) return;
    setError(null);
    setVisibility(next);
  };

  const handleConfirm = async () => {
    if (isPublishing) return;
    setIsPublishing(true);
    setError(null);
    try {
      if (description.trim() !== project.description) await submitDescription();
      if (tags.trim() !== project.tags) await submitTags();
      await pendingSaves.current.flush();
      if (visibility === "published") {
        const { error: err } = await publishProject(projectId, project.restoreEpoch);
        if (err) {
          setError(err);
          return;
        }
      } else if (visibility !== project.visibility) {
        const { error: err } = await setProjectVisibility(projectId, visibility, project.restoreEpoch);
        if (err) {
          setError(err);
          return;
        }
      }
      setProject(previous => previous && { ...previous, visibility });
      setJustPublished(true);
      setTimeout(() => setJustPublished(false), 2000);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Something went wrong — try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const shareUrl =
    project.visibility === "private" || typeof window === "undefined"
      ? null
      : `${window.location.origin}/p/${projectId}`;

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError("Couldn't copy the link — copy it manually.");
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="flex h-dvh w-full flex-col bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_23.75rem] lg:grid-rows-[60px_minmax(0,1fr)]">
      <div className="flex h-[60px] shrink-0 items-center gap-4 border-b border-border pl-2.5 pr-6 lg:col-start-1 lg:row-start-1 lg:border-b-0">
        <Link href="/projects" title="Back to projects">
          <Mark />
        </Link>
        <span className="h-[18px] w-px shrink-0 bg-border" />
        <button
          type="button"
          onClick={() => router.push(`/editor/${projectId}`)}
          className="flex items-center gap-0.5 text-sm leading-none text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="leading-none">Editor</span>
        </button>
        <h1 className="text-[1.0625rem] font-semibold leading-none">Share</h1>
      </div>

      <div tabIndex={0} role="region" aria-label="Explore preview" className="min-w-0 flex-1 overflow-y-auto bg-muted focus-visible:outline-2 focus-visible:outline-ring lg:col-start-1 lg:row-start-2 lg:min-h-0">
        <SharePreview card={yourCard} visibility={visibility} />
      </div>

      <div className="flex min-w-0 flex-col gap-6 overflow-y-auto border-l border-border p-6 pb-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:min-h-0 [&>*]:shrink-0">
        {profile && <TaskHint id={`${profile.username}:publish`}>Before publishing, check the description and read each trail from the editor. Readers see the published snapshot; later edits stay private until you publish an update.</TaskHint>}
        <div className="flex flex-col gap-1.5">
          <Label>Visibility</Label>
          <p className="text-xs text-muted-foreground">Sharing or publishing also makes note images available to readers. Returning to private stops new access links; existing links expire within five minutes.</p>
          <div className="flex flex-col gap-2">
            {VISIBILITY_OPTIONS.map((option) => {
              const isActive = option.value === visibility;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isPublishing}
                  onClick={() => changeVisibility(option.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3.5 py-2.5 text-left transition-colors disabled:opacity-60",
                    isActive ? "border-foreground bg-foreground/5" : "border-border hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.8125rem] font-medium">{option.label}</span>
                    <span className="block truncate text-[0.75rem] text-muted-foreground">{option.description}</span>
                  </span>
                  {isActive && (
                    visibility === project.visibility ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : (
                      <span className="shrink-0 text-[0.6875rem] text-muted-foreground">unsaved</span>
                    )
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="publish-description">Description</Label>
          <Textarea
            id="publish-description"
            placeholder="What's this project about?"
            value={description}
            maxLength={PROJECT_TEXT_MAX_LENGTH}
            disabled={isPublishing}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => void submitDescription().catch(failure => setError(failure instanceof Error ? failure.message : "Could not save description. Try again."))}
            rows={4}
            className="resize-none rounded-xs border-input px-4 py-3 shadow-none"
          />
          <p className="text-xs text-muted-foreground">{description.length}/{PROJECT_TEXT_MAX_LENGTH} characters</p>
        </div>

        <TagsField value={tags} onChange={setTags} onCommit={() => void submitTags().catch(() => setError("Could not save tags. Try again."))} />

        <ThumbnailPicker
          projectId={projectId}
          project={project}
          imageUrl={thumbnailImageUrl}
          onChange={setThumbnailImageUrl}
          onError={setError}
        />

        <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center gap-2 bg-background px-6 pb-3 pt-3">
          {shareUrl && (
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border px-3 py-1">
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 min-w-0 flex-1 items-center truncate text-[0.8125rem] text-primary underline">
                Open public link
              </a>
              <button
                type="button"
                onClick={copyShareUrl}
                aria-label="Copy public link"
                className="flex min-h-8 shrink-0 items-center gap-1.5 text-[0.8125rem] font-medium hover:text-foreground"
              >
                {linkCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          )}
          {error && <p role="alert" className="order-last w-full text-xs text-destructive">{error}</p>}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPublishing || justPublished}
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[0.875rem] font-medium text-background shadow-elevation-2 disabled:opacity-60"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {confirmLabel === "publish" ? "Publishing..." : confirmLabel === "update" ? "Updating..." : "Saving..."}
              </>
            ) : justPublished ? (
              <>
                <Check className="h-4 w-4" />
                {confirmLabel === "publish" ? "Published" : confirmLabel === "update" ? "Updated" : "Saved"}
              </>
            ) : (
              confirmLabel === "publish" ? "Publish" : confirmLabel === "update" ? "Update" : "Save"
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
