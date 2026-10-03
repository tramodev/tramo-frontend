"use client"

import { useState } from "react"
import Link from "next/link"
import { ExternalLink, History } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Row } from "@/components/profile/row"
import { EditorImagesProvider } from "@/components/editor/editor-images-provider"
import { LexicalReadOnly } from "@/components/project/lexical-read-only"
import {
  getProjectSnapshot,
  getProjectSnapshots,
  type ProjectSnapshotDetail,
  type ProjectSnapshotSummary,
} from "@/lib/project-snapshots"

interface VersionHistorySheetProps {
  projectId: string;
}

export function VersionHistorySheet({ projectId }: VersionHistorySheetProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<ProjectSnapshotSummary[]>([]);
  const [detail, setDetail] = useState<ProjectSnapshotDetail | null>(null);

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (!next) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setVersions(await getProjectSnapshots(projectId));
    setLoading(false);
  };

  const openVersion = async (versionId: string) => {
    setLoading(true);
    setDetail(await getProjectSnapshot(projectId, versionId));
    setLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="lg">
          <History className="h-[15px] w-[15px]" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {detail ? `Version ${detail.version}` : "Version history"}
          </SheetTitle>
          <SheetDescription>
            {detail
              ? "Frozen content as it was when this version was published."
              : "Every time you publish, a new version is saved here."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-1 px-4 pb-4">
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

          {!loading && detail && (
            <EditorImagesProvider projectId={projectId} publicRead={false} snapshotId={Number(detail.id)}>
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="self-start" onClick={() => setDetail(null)}>
                  Back to versions
                </Button>
                <Link
                  href={`/p/${projectId}/versions/${detail.id}`}
                  target="_blank"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Public link <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              {detail.trails.map((trail) => (
                <div key={trail.id} className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold">{trail.title}</h3>
                  {trail.items.map((item) => (
                    <div key={item.id} className="flex flex-col gap-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.content && (
                        <div className="text-sm text-muted-foreground">
                          <LexicalReadOnly content={item.content} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            </EditorImagesProvider>
          )}

          {!loading && !detail && versions.length === 0 && (
            <p className="text-sm text-muted-foreground">No published versions yet.</p>
          )}

          {!loading && !detail && versions.map((version) => (
            <button key={version.id} type="button" onClick={() => openVersion(version.id)} className="text-left">
              <Row>
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-sm font-medium">Version {version.version}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleString()}
                  </span>
                </div>
              </Row>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
