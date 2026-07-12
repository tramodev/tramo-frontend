"use client"

import { useState } from "react"
import { Check, Copy, Globe, Lock, Share2, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { setProjectVisibility, setProjectTags, type ProjectVisibility } from "@/lib/projects-store"
import { cn } from "@/lib/utils"

interface ShareDialogProps {
  projectId: string;
  visibility: ProjectVisibility;
  onVisibilityChange: (visibility: ProjectVisibility) => void;
  tags: string;
  onTagsChange: (tags: string) => void;
}

const OPTIONS: {
  value: ProjectVisibility;
  label: string;
  icon: typeof Lock;
  description: string;
}[] = [
  {
    value: "private",
    label: "Private",
    icon: Lock,
    description: "Only you can access this project",
  },
  {
    value: "unlisted",
    label: "Unlisted",
    icon: Users,
    description: "Anyone with the link can view this project",
  },
  {
    value: "published",
    label: "Published",
    icon: Globe,
    description: "Anyone with the link can view it, and it's listed on the Explore page",
  },
];

export function ShareDialog({ projectId, visibility, onVisibilityChange, tags, onTagsChange }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [tagsInput, setTagsInput] = useState(tags);
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/p/${projectId}`
    : "";
  const current = OPTIONS.find((option) => option.value === visibility) ?? OPTIONS[0];

  const changeVisibility = async (next: ProjectVisibility) => {
    if (next === visibility) return;
    onVisibilityChange(next);
    await setProjectVisibility(projectId, next);
  };

  const submitTags = async () => {
    const next = tagsInput.trim();
    if (next === tags) return;
    onTagsChange(next);
    await setProjectTags(projectId, next);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="rounded-none">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this project</DialogTitle>
          <DialogDescription>
            Control who can access this project and whether it&apos;s publicly listed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = option.value === visibility;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => changeVisibility(option.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-colors",
                  isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" style={isActive ? { color: "var(--color-accent)" } : undefined} />
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{current.description}</p>

        {visibility !== "private" && (
          <div className="flex items-center gap-2">
            <Label htmlFor="share-link" className="sr-only">
              Share link
            </Label>
            <Input id="share-link" readOnly value={shareUrl} className="flex-1" />
            <Button variant="outline" size="icon" onClick={copyLink} aria-label="Copy link">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {visibility === "published" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="share-tags">Tags</Label>
            <Input
              id="share-tags"
              placeholder="webdev, react, tutorial"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onBlur={submitTags}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitTags();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Helps people find this on Explore and shows up in Hot topics.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
