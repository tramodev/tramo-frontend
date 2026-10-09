// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useRef, useState } from "react"
import { Loader2, Route, Upload } from "lucide-react"
import { toBlob } from "html-to-image"

import { Label } from "@/components/ui/label"
import { ProjectThumbnail } from "@/components/project/project-thumbnail"
import { KnowledgeGraph } from "@/components/editor/knowledge-graph"
import {
  getMapPreviews,
  setProjectThumbnail,
  type Project,
  type MapPreviews,
} from "@/lib/projects-store"
import { uploadImage } from "@/lib/upload-image"
import { cn } from "@/lib/utils"

function UploadThumbnailTab({ disabled, onFile }: { disabled: boolean; onFile: (file: File) => void }) {
  return (
    <label
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors",
        "border-border hover:bg-muted",
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
  onChange,
  onError,
}: {
  projectId: string;
  project: Project;
  imageUrl: string | null;
  onChange: (imageUrl: string | null) => void;
  onError: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [snapshotPreviews, setSnapshotPreviews] = useState<MapPreviews | null>(null);
  const snapshotRef = useRef<HTMLDivElement>(null);

  const apply = async (nextImageUrl: string) => {
    setSaving(true);
    onChange(nextImageUrl);
    try {
      await setProjectThumbnail(projectId, nextImageUrl);
    } catch {
      onChange(imageUrl);
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
      await apply(url);
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

      <div className="relative">
        <ProjectThumbnail
          thumbnailImageUrl={imageUrl}
          title={project.title}
          className="h-48 w-full rounded-lg border border-border bg-surface-container-high"
        />
        {snapshotPreviews && <div className="pointer-events-none absolute left-[-10000px] top-0 h-48 w-full">
          <div ref={snapshotRef} className="h-48 w-full overflow-hidden rounded-lg border border-border bg-surface-container-high">
            <KnowledgeGraph trails={project.trails} items={project.items} mapPreviews={snapshotPreviews} graphColors={project.graphColors} onSelectItem={() => {}} variant="preview" />
          </div>
        </div>}
      </div>

      <p className="text-xs text-muted-foreground">Thumbnails are public. Do not upload confidential information.</p>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={saving || !project.trails.length}
          onClick={async () => {
            setSaving(true);
            try {
              const previews = await getMapPreviews(projectId);
              setSnapshotPreviews(previews);
              const filed = new Set(project.trails.flatMap(trail => trail.itemIds));
              const cardCount = project.trails.reduce((total, trail) => total + trail.itemIds.length, 0) + Object.keys(project.items).filter(id => !filed.has(id)).length;
              for (let frame = 0; frame < 60 && snapshotRef.current?.querySelectorAll(".react-flow__node-card").length !== cardCount; frame++) {
                await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
              }
              if (snapshotRef.current?.querySelectorAll(".react-flow__node-card").length !== cardCount) throw new Error("Map preview did not finish rendering");
              await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
              await document.fonts.ready;
              const node = snapshotRef.current;
              if (!node) throw new Error("Map preview is unavailable");
              const blob = await toBlob(node, { pixelRatio: 2 });
              if (!blob) throw new Error("Could not capture map preview");
              const url = await uploadImage(blob, "thumbnail", projectId);
              await apply(url);
            } catch {
              onError("Couldn't create the map thumbnail — try again.");
            } finally {
              setSnapshotPreviews(null);
              setSaving(false);
            }
          }}
          className="flex flex-col items-center gap-1 rounded-lg border border-border px-2 py-2 text-[12px] font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <Route className="h-3.5 w-3.5" />
          Map snapshot
        </button>
        <UploadThumbnailTab disabled={saving} onFile={handleUpload} />
      </div>
    </div>
  );
}
