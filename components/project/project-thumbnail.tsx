// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import Image from "next/image"
import type { GraphPreviewData } from "@/lib/feed"
import { initial } from "@/components/shared/author-avatar"

export function ProjectThumbnail({
  thumbnailImageUrl,
  thumbnailGraph,
  title,
  className = "",
  placeholder,
}: {
  thumbnailImageUrl: string | null;
  thumbnailGraph: GraphPreviewData | null;
  title: string;
  className?: string;
  placeholder?: React.ReactNode;
}) {
  if (thumbnailImageUrl) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={thumbnailImageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover object-top" />
      </div>
    )
  }
  if (thumbnailGraph) {
    const trails = "trails" in thumbnailGraph ? thumbnailGraph.trails : [{ id: thumbnailGraph.trailId, title: thumbnailGraph.trailTitle, itemIds: thumbnailGraph.itemIds }]
    if (trails.length) {
      const columns = trails.length <= 2 ? 1 : 2
      const rows = Math.ceil(trails.length / columns)
      const noteTitles = new Map(thumbnailGraph.items.map(item => [item.id, item.title]))
      return (
        <div className={`overflow-hidden ${className}`}>
          <div className={`grid h-full w-full ${rows > 2 ? "gap-1 p-2" : "gap-2 p-3"}`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
            {trails.map(trail => (
              <div key={trail.id} className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-card ${rows > 2 ? "px-2 py-0.5" : "px-2.5 py-2"}`}>
                <div className={`truncate font-display font-medium leading-tight text-foreground ${rows === 1 ? "text-2xl" : rows <= 2 ? "text-xl" : rows <= 4 ? "text-sm" : "text-[11px]"}`}>{trail.title}</div>
                {rows <= 2 && <div className="mt-1 min-h-0 overflow-hidden border-l border-border pl-2 text-sm text-muted-foreground">
                  {trail.itemIds.slice(0, rows === 1 ? 3 : 1).map(id => <div key={id} className="truncate">{noteTitles.get(id) || "Untitled note"}</div>)}
                  {!trail.itemIds.length && <div>No notes yet</div>}
                </div>}
              </div>
            ))}
          </div>
        </div>
      )
    }
  }
  return (
    <div className={`grid place-items-center overflow-hidden ${className}`}>
      {placeholder ?? <span className="font-display text-2xl font-medium text-primary">{initial(title)}</span>}
    </div>
  )
}
