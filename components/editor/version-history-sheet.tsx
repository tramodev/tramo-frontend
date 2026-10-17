// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
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
import {
  getProjectSnapshots,
  type ProjectSnapshotSummary,
} from "@/lib/project-snapshots"

interface VersionHistorySheetProps {
  projectId: string;
}

export function VersionHistorySheet({ projectId }: VersionHistorySheetProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<ProjectSnapshotSummary[]>([]);

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (!next) return;
    setLoading(true);
    setVersions(await getProjectSnapshots(projectId));
    setLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" title="Publish history" aria-label="Publish history">
          <History className="h-[15px] w-[15px]" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Version history</SheetTitle>
          <SheetDescription>
            Every time you publish, a new version is saved here.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-1 px-4 pb-4 [&>div]:rounded-none">
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

          {!loading && versions.length === 0 && (
            <p className="text-sm text-muted-foreground">No published versions yet.</p>
          )}

          {!loading && versions.map((version) => (
            <Row key={version.id}>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm font-medium">Version {version.version}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(version.createdAt).toLocaleString()}
                </span>
              </div>
              <Link
                href={`/p/${projectId}/versions/${version.id}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open version ${version.version} in a new tab`}
                className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Open link <ExternalLink className="h-3 w-3" />
              </Link>
            </Row>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
