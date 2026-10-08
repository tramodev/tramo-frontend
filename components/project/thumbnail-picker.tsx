// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState } from "react"
import { Loader2, Route, Upload } from "lucide-react"

import { Label } from "@/components/ui/label"
import { ProjectThumbnail } from "@/components/project/project-thumbnail"
import {
  setProjectThumbnail,
  type Project,
  type ThumbnailChoice,
} from "@/lib/projects-store"
import { uploadImage } from "@/lib/upload-image"
import { cn } from "@/lib/utils"

function UploadThumbnailTab({ disabled, active, onFile }: { disabled: boolean; active: boolean; onFile: (file: File) => void }) {
  return (
    <label
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors",
        active ? "border-foreground bg-foreground/5" : "border-border hover:bg-muted",
        disabled ? "pointer-events-none opacity-50" : "cursor-pointer"
      )}
    >
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
      <Upload className="h-3.5 w-3.5" />
      Upload
    </label>
  );
}

export function ThumbnailPicker({
  projectId,
  project,
  imageUrl,
  graph,
  onChange,
  onError,
}: {
  projectId: string;
  project: Project;
  imageUrl: string | null;
  graph: Project["thumbnailGraph"];
  onChange: (imageUrl: string | null, graph: Project["thumbnailGraph"]) => void;
  onError: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  const apply = async (choice: ThumbnailChoice, optimistic: { imageUrl: string | null; graph: Project["thumbnailGraph"] }) => {
    setSaving(true);
    onChange(optimistic.imageUrl, optimistic.graph);
    try {
      await setProjectThumbnail(projectId, choice);
    } catch {
      onError("Couldn't update the thumbnail — try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (file.type === "image/gif") {
      onError("GIFs aren't supported — upload a static image instead.");
      return;
    }
    setSaving(true);
    try {
      const url = await uploadImage(file, "thumbnail", projectId);
      await apply({ type: "DEDICATED", imageUrl: url }, { imageUrl: url, graph: null });
    } catch {
      onError("Upload failed — try again.");
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>Thumbnail</Label>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      <ProjectThumbnail
        thumbnailImageUrl={imageUrl}
        thumbnailGraph={graph}
        title={project.title}
        className="h-48 w-full rounded-lg border border-border bg-surface-container-high"
      />

      <p className="text-xs text-muted-foreground">Thumbnails are public. Do not upload confidential information.</p>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={saving || !project.trails.length}
          onClick={() => {
            const ids = new Set(project.trails.flatMap(trail => trail.itemIds));
            const next = {
              trails: project.trails.map(trail => ({ id: trail.id, title: trail.title, itemIds: trail.itemIds })),
              items: [...ids].map(id => ({
                id,
                title: project.items[id]?.title ?? "",
                associations: project.items[id]?.associations ?? [],
              })),
            };
            void apply({ type: "GRAPH" }, { imageUrl: null, graph: next });
          }}
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors disabled:opacity-50",
            graph && !imageUrl ? "border-foreground bg-foreground/5" : "border-border hover:bg-muted"
          )}
        >
          <Route className="h-3.5 w-3.5" />
          Trails
        </button>
        <UploadThumbnailTab disabled={saving} active={!!imageUrl} onFile={handleUpload} />
      </div>
    </div>
  );
}
