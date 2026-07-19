"use client"

import { useState } from "react"
import { Check, Copy, Globe, Lock, Share2, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  setProjectVisibility,
  setProjectDescription,
  setProjectTags,
  type ProjectVisibility,
} from "@/lib/projects-store"
import { getSubscriptionStatus, type SubscriptionStatus } from "@/lib/subscription"
import { cn } from "@/lib/utils"

interface ShareDialogProps {
  projectId: string;
  visibility: ProjectVisibility;
  onVisibilityChange: (visibility: ProjectVisibility) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
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

export function ShareDialog({
  projectId,
  visibility,
  onVisibilityChange,
  description,
  onDescriptionChange,
  tags,
  onTagsChange,
}: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState(visibility);
  const [descriptionInput, setDescriptionInput] = useState(description);
  const [tagsInput, setTagsInput] = useState(tags);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [planStatus, setPlanStatus] = useState<SubscriptionStatus | null>(null);
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/p/${projectId}`
    : "";
  const selected = OPTIONS.find((option) => option.value === selectedVisibility) ?? OPTIONS[0];
  const hasPendingChange = selectedVisibility !== visibility;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSelectedVisibility(visibility);
      setDescriptionInput(description);
      setTagsInput(tags);
      setValidationError(null);
      getSubscriptionStatus().then(setPlanStatus).catch(() => {});
    }
    setOpen(next);
  };

  const submitDescription = async () => {
    const next = descriptionInput.trim();
    if (next === description) return;
    onDescriptionChange(next);
    await setProjectDescription(projectId, next);
  };

  const submitTags = async () => {
    const next = tagsInput.trim();
    if (next === tags) return;
    onTagsChange(next);
    await setProjectTags(projectId, next);
  };

  const applyVisibility = async () => {
    if (!hasPendingChange || isApplying) return;

    if (selectedVisibility === "published" && !descriptionInput.trim()) {
      setValidationError("Add a description before publishing.");
      return;
    }

    setIsApplying(true);
    setValidationError(null);
    try {
      if (descriptionInput.trim() !== description) {
        await submitDescription();
      }
      onVisibilityChange(selectedVisibility);
      const { error } = await setProjectVisibility(projectId, selectedVisibility);
      if (error) {
        setSelectedVisibility(visibility);
        onVisibilityChange(visibility);
        setValidationError(error);
      }
    } catch {
      setSelectedVisibility(visibility);
      onVisibilityChange(visibility);
      setValidationError("Something went wrong — try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg">
          <Share2 className="h-[15px] w-[15px]" />
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
            const isActive = option.value === selectedVisibility;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedVisibility(option.value);
                  setValidationError(null);
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
                  isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{selected.description}</p>
        {selectedVisibility === "published" && planStatus && planStatus.publishesPerWeek !== -1 && (
          <p className="text-xs text-muted-foreground">
            {planStatus.publishesUsedThisWeek}/{planStatus.publishesPerWeek} weekly publishes used on the free
            plan — republishing an existing project doesn&apos;t count.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="share-description">Description</Label>
          <Textarea
            id="share-description"
            placeholder="What's this project about?"
            value={descriptionInput}
            onChange={(e) => setDescriptionInput(e.target.value)}
            onBlur={submitDescription}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Required to publish. Shown on Explore and the public project page.
          </p>
        </div>

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

        {(hasPendingChange || validationError) && (
          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-col">
            {validationError && (
              <p className="text-xs text-destructive">{validationError}</p>
            )}
            {hasPendingChange && (
              <Button onClick={applyVisibility} disabled={isApplying} className="w-full">
                {isApplying ? "Applying..." : `Switch to ${selected.label}`}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
