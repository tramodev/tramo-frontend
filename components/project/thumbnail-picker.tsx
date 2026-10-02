"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ImageIcon, Loader2, Route, Upload } from "lucide-react"

import { Label } from "@/components/ui/label"
import { ProjectThumbnail } from "@/components/project/project-thumbnail"
import {
  getProjectImages,
  setProjectThumbnail,
  type Project,
  type ProjectImage,
  type ThumbnailChoice,
} from "@/lib/projects-store"
import { uploadImage } from "@/lib/upload-image"
import { cn } from "@/lib/utils"

function UploadThumbnailTab({ disabled, active, onFile }: { disabled: boolean; active: boolean; onFile: (file: File) => void }) {
  return (
    <label
      className={cn(
        "flex flex-col notes-center gap-1 rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors",
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
  const [tab, setTab] = useState<"trail" | "image" | "upload">("trail");
  const [images, setImages] = useState<ProjectImage[] | null>(null);
  const [saving, setSaving] = useState(false);
  const imagesLoading = tab === "image" && images === null;

  useEffect(() => {
    if (tab !== "image" || images !== null) return;
    getProjectImages(projectId)
      .then(setImages)
      .catch(() => setImages([]));
  }, [tab, images, projectId]);

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
      setTab("upload");
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

      <div className="grid grid-cols-3 gap-1.5">
        {([
          { key: "trail", label: "Trail", icon: Route },
          { key: "image", label: "Project image", icon: ImageIcon },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex flex-col notes-center gap-1 rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors",
              tab === key ? "border-foreground bg-foreground/5" : "border-border hover:bg-muted"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
        <UploadThumbnailTab disabled={saving} active={tab === "upload"} onFile={handleUpload} />
      </div>

      {tab === "trail" && (
        <div className="flex flex-wrap gap-1.5">
          {project.trails.filter((t) => t.itemIds.length > 0).map((trail) => {
            const isActive = graph?.trailId === trail.id;
            return (
              <button
                key={trail.id}
                type="button"
                disabled={saving}
                onClick={() => {
                  const next = {
                    trailId: trail.id,
                    trailTitle: trail.title,
                    itemIds: trail.itemIds,
                    items: trail.itemIds.map((id) => ({
                      id,
                      title: project.items[id]?.title ?? "",
                      associations: project.items[id]?.associations ?? [],
                    })),
                  };
                  apply({ type: "GRAPH", trailId: trail.id }, { imageUrl: null, graph: next });
                }}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs disabled:opacity-50",
                  isActive ? "border-foreground bg-foreground/5" : "border-border hover:bg-muted"
                )}
              >
                {trail.title}
              </button>
            );
          })}
          {project.trails.every((t) => t.itemIds.length === 0) && (
            <p className="text-xs text-muted-foreground">No trails with notes yet.</p>
          )}
        </div>
      )}

      {tab === "image" && (
        <div className="flex flex-wrap gap-2">
          {imagesLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!imagesLoading && images?.length === 0 && (
            <p className="text-xs text-muted-foreground">No images in this project yet.</p>
          )}
          {images?.slice(0, 3).map((img) => {
            const isActive = imageUrl === img.url;
            return (
              <Image
                key={img.url}
                src={img.url}
                alt={img.itemTitle}
                title={img.itemTitle}
                width={104}
                height={96}
                onClick={() => !saving && apply(
                  { type: "PROJECT_IMAGE", imageUrl: img.url },
                  { imageUrl: img.url, graph: null }
                )}
                className={cn(
                  "h-24 w-[104px] cursor-pointer rounded-lg border object-cover",
                  isActive ? "outline outline-2 outline-foreground" : "border-border hover:border-foreground"
                )}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
