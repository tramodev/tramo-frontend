"use client"

import { useState } from "react"
import { Check, Copy, Globe, Lock, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { setProjectVisibility, type ProjectVisibility } from "@/lib/projects-store"

interface ShareDialogProps {
  projectId: string;
  visibility: ProjectVisibility;
  onVisibilityChange: (visibility: ProjectVisibility) => void;
}

export function ShareDialog({ projectId, visibility, onVisibilityChange }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const isPublic = visibility === "public";
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/dashboard/${projectId}`
    : "";

  const toggleVisibility = async (checked: boolean) => {
    const next: ProjectVisibility = checked ? "public" : "private";
    onVisibilityChange(next);
    await setProjectVisibility(projectId, next);
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
            Control who can access this project and share the link.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border-2 border-border p-3">
          <div className="flex items-center gap-3">
            {isPublic ? (
              <Globe className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {isPublic ? "Public" : "Private"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPublic
                  ? "Anyone with the link can view this project"
                  : "Only you can access this project"}
              </p>
            </div>
          </div>
          <Switch
            checked={isPublic}
            onCheckedChange={toggleVisibility}
            aria-label="Toggle public access"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="share-link" className="sr-only">
            Share link
          </Label>
          <Input id="share-link" readOnly value={shareUrl} className="flex-1" />
          <Button variant="outline" size="icon" onClick={copyLink} aria-label="Copy link">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
