// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import Image from "next/image"
import type { Item, Trail } from "@/app/editor/types"
import type { GraphPreviewData } from "@/lib/feed"
import { KnowledgeGraph } from "@/components/editor/knowledge-graph"
import { initial } from "@/components/shared/author-avatar"

function toGraphProps(graph: GraphPreviewData): { trails: Trail[]; items: Record<string, Item> } {
  const graphTrails = "trails" in graph ? graph.trails : [{ id: graph.trailId, title: graph.trailTitle, itemIds: graph.itemIds }]
  const trails: Trail[] = graphTrails.map(trail => ({
    ...trail,
    description: "",
    steps: [],
    version: 1,
    forkedFrom: null,
  }))
  const items: Record<string, Item> = {}
  for (const item of graph.items) {
    items[item.id] = {
      id: item.id,
      title: item.title,
      titleAlign: "center",
      unfiled: false,
      content: null,
      associations: item.associations,
      linkedItemIds: item.associations.map((a) => a.targetId),
    }
  }
  return { trails, items }
}

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
    const { trails, items } = toGraphProps(thumbnailGraph)
    return (
      <div className={`overflow-hidden ${className}`}>
        <KnowledgeGraph trails={trails} items={items} onSelectItem={() => {}} variant="thumbnail" />
      </div>
    )
  }
  return (
    <div className={`grid place-items-center overflow-hidden ${className}`}>
      {placeholder ?? <span className="font-display text-2xl font-medium text-primary">{initial(title)}</span>}
    </div>
  )
}
