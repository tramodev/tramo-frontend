"use client"

import Image from "next/image"
import type { Item, Trail } from "@/app/editor/types"
import { KnowledgeGraph } from "@/components/editor/knowledge-graph"
import { initial } from "@/components/shared/author-avatar"
import type { GraphPreviewData } from "@/lib/feed"

function GraphThumbnail({ graph, className }: { graph: GraphPreviewData; className: string }) {
  const sourceTrails = "trails" in graph ? graph.trails : [{ id: graph.trailId, title: graph.trailTitle, itemIds: graph.itemIds }]

  const trails: Trail[] = sourceTrails.map(trail => ({ ...trail, description: "", steps: trail.itemIds.map(itemId => ({ itemId })), version: 1, forkedFrom: null }))
  const items: Record<string, Item> = Object.fromEntries(graph.items.map(item => [item.id, {
    ...item,
    titleAlign: "left",
    unfiled: false,
    content: null,
    linkedItemIds: [],
    associations: item.associations ?? [],
  }]))

  return <div className={`overflow-hidden ${className}`}><KnowledgeGraph trails={trails} items={items} onSelectItem={() => {}} variant="preview" /></div>
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
  if (thumbnailGraph && ("trails" in thumbnailGraph ? thumbnailGraph.trails.length > 0 : true)) {
    return <GraphThumbnail graph={thumbnailGraph} className={className} />
  }
  return (
    <div className={`grid place-items-center overflow-hidden ${className}`}>
      {placeholder ?? <span className="font-display text-2xl font-medium text-primary">{initial(title)}</span>}
    </div>
  )
}
