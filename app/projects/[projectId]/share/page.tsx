"use client"

import { useEffect, useState } from "react"
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
  const [profile, setProfile] = useState<{ username: string; imageUrl: string | null; selectedBadge: string | null } | null>(null);

  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [thumbnailImageUrl, setThumbnailImageUrl] = useState<string | null>(null);
  const [thumbnailGraph, setThumbnailGraph] = useState<Project["thumbnailGraph"]>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    getProject(projectId).then((p) => {
      if (!p) return;
      setProject(p);
      setDescription(p.description);
      setTags(p.tags);
      setVisibility(p.visibility);
      setThumbnailImageUrl(p.thumbnailImageUrl);
      setThumbnailGraph(p.thumbnailGraph);
    });
    getMyProfile().then((p) => p && setProfile({ username: p.username, imageUrl: p.imageUrl, selectedBadge: p.selectedBadge }));
  }, [projectId]);

  if (!project) return null;

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
    thumbnailGraph,
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
    setProject({ ...project, description: next });
    await setProjectDescription(projectId, next);
  };

  const submitTags = async () => {
    const next = tags.trim();
    if (next === project.tags) return;
    setProject({ ...project, tags: next });
    await setProjectTags(projectId, next);
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
      if (visibility === "published") {
        const { error: err } = await publishProject(projectId);
        if (err) {
          setError(err);
          return;
        }
      } else if (visibility !== project.visibility) {
        const { error: err } = await setProjectVisibility(projectId, visibility);
        if (err) {
          setError(err);
          return;
        }
      }
      setProject({ ...project, visibility, description: description.trim() });
      setJustPublished(true);
      setTimeout(() => setJustPublished(false), 2000);
    } catch {
      setError("Something went wrong — try again.");
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
    <div className="flex h-svh flex-col bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[60px_1fr]">
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
        <span className="text-[17px] font-semibold leading-none">Share</span>
      </div>

      <div className="flex-1 overflow-y-auto lg:col-start-1 lg:row-start-2 lg:min-h-0">
        <SharePreview card={yourCard} />
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto border-l border-border p-6 pb-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:min-h-0 [&>*]:shrink-0">
        <TaskHint id={`publish:${projectId}`}>Before publishing, check the description and read each trail from the editor. Readers see the published snapshot; later edits stay private until you publish an update.</TaskHint>
        <div className="flex flex-col gap-1.5">
          <Label>Visibility</Label>
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
                    <span className="block text-[13px] font-medium">{option.label}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{option.description}</span>
                  </span>
                  {isActive && (
                    visibility === project.visibility ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : (
                      <span className="shrink-0 text-[11px] text-muted-foreground">unsaved</span>
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
            onChange={(e) => setDescription(e.target.value)}
            onBlur={submitDescription}
            rows={4}
            className="resize-none rounded-xs border-input px-4 py-3 shadow-none"
          />
        </div>

        <TagsField value={tags} onChange={setTags} onCommit={submitTags} />

        <ThumbnailPicker
          projectId={projectId}
          project={project}
          imageUrl={thumbnailImageUrl}
          graph={thumbnailGraph}
          onChange={(imageUrl, graph) => {
            setThumbnailImageUrl(imageUrl);
            setThumbnailGraph(graph);
          }}
          onError={setError}
        />

        <div className="sticky bottom-0 -mx-6 flex flex-col gap-2 bg-background px-6 pb-6 pt-3">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPublishing || justPublished}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-foreground text-[14px] font-medium text-background shadow-elevation-2 disabled:opacity-60"
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

        {shareUrl && (
          <div className="mb-6 flex items-center gap-2 rounded-md border border-border px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
              {shareUrl}
            </span>
            <button
              type="button"
              onClick={copyShareUrl}
              className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium hover:text-foreground"
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
      </div>
    </div>
  );
}
