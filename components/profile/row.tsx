// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import Link from "next/link"
import { ProjectThumbnail } from "@/components/project/project-thumbnail"

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-center gap-5 rounded-2xl transition-colors hover:bg-card -mx-4 py-4 px-4">
      {children}
    </div>
  )
}

export function Thumbnail({
  thumbnailImageUrl,
  title,
}: {
  thumbnailImageUrl: string | null
  title: string
}) {
  return (
    <ProjectThumbnail
      thumbnailImageUrl={thumbnailImageUrl}
      title={title}
      className="shrink-0 rounded-md w-24 h-16 bg-surface-container-high"
    />
  )
}

export function EmptyState({ message, linkHref, linkLabel }: { message: string; linkHref: string; linkLabel: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      {message}{" "}
      <Link href={linkHref} className="font-medium text-primary">
        {linkLabel}
      </Link>
    </p>
  )
}
