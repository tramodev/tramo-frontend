// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import Image from "next/image"
import type { GraphPreviewData } from "@/lib/feed"
import { initial } from "@/components/shared/author-avatar"

const LANE_WIDTH = 180
const LANE_GAP = 24
const CARD_WIDTH = 160
const CARD_HEIGHT = 64
const CARD_GAP = 12
const CARD_TOP = 68

function GraphThumbnail({ graph, className }: { graph: GraphPreviewData; className: string }) {
  const trails = "trails" in graph ? graph.trails : [{ id: graph.trailId, title: graph.trailTitle, itemIds: graph.itemIds }]
  if (!trails.length) return null

  const singleTrail = trails.length === 1
  const laneWidth = singleTrail ? LANE_WIDTH * 2 : LANE_WIDTH
  const width = trails.length * laneWidth + (trails.length - 1) * LANE_GAP
  const noteRows = singleTrail ? Math.ceil(trails[0].itemIds.length / 2) : Math.max(...trails.map(trail => trail.itemIds.length))
  const height = Math.max(132, CARD_TOP + noteRows * (CARD_HEIGHT + CARD_GAP) + 8)
  const items = new Map(graph.items.map(item => [item.id, item]))
  const appearances = new Map<string, { key: string; x: number; y: number }[]>()
  const cards = trails.flatMap((trail, column) => trail.itemIds.map((id, row) => {
    const x = singleTrail
      ? trail.itemIds.length === 1 ? (laneWidth - CARD_WIDTH) / 2 : 10 + row % 2 * LANE_WIDTH
      : column * (laneWidth + LANE_GAP) + 10
    const y = CARD_TOP + (singleTrail ? Math.floor(row / 2) : row) * (CARD_HEIGHT + CARD_GAP)
    const card = { id, key: `${trail.id}:${id}`, x, y }
    appearances.set(id, [...(appearances.get(id) ?? []), card])
    return card
  }))

  return (
    <div className={`overflow-hidden ${className}`}>
      <svg role="img" aria-label={`Map of ${trails.length} trails`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="pointer-events-none h-full w-full select-none">
        {trails.map((trail, column) => {
          const x = column * (laneWidth + LANE_GAP)
          return <g key={trail.id}>
            <rect x={x} y={0} width={laneWidth} height={height} rx={10} fill="var(--popover)" stroke="var(--border)" />
            <foreignObject x={x + 8} y={5} width={laneWidth - 16} height={40}>
              <div className="flex h-full items-center overflow-hidden font-display text-[32px] font-semibold leading-tight text-primary"><span className="truncate">{trail.title}</span></div>
            </foreignObject>
          </g>
        })}
        {singleTrail && cards.slice(1).map((target, index) => {
          const source = cards[index]
          const sameRow = source.y === target.y
          const fromX = sameRow ? source.x + CARD_WIDTH : source.x + CARD_WIDTH / 2
          const fromY = sameRow ? source.y + CARD_HEIGHT / 2 : source.y + CARD_HEIGHT
          const toX = sameRow ? target.x : target.x + CARD_WIDTH / 2
          const toY = sameRow ? target.y + CARD_HEIGHT / 2 : target.y
          const middleY = (fromY + toY) / 2
          return <path key={`order:${source.key}:${target.key}`} d={sameRow ? `M ${fromX} ${fromY} L ${toX} ${toY}` : `M ${fromX} ${fromY} C ${fromX} ${middleY}, ${toX} ${middleY}, ${toX} ${toY}`} fill="none" stroke="var(--border)" strokeWidth={2} strokeDasharray="3 5" />
        })}
        {[...appearances.values()].flatMap(copies => copies.slice(1).map((target, index) => {
          const source = copies[index]
          const fromX = source.x + CARD_WIDTH
          const toX = target.x
          const fromY = source.y + CARD_HEIGHT / 2
          const toY = target.y + CARD_HEIGHT / 2
          const middle = (fromX + toX) / 2
          return <path key={`shared:${source.key}:${target.key}`} d={`M ${fromX} ${fromY} C ${middle} ${fromY}, ${middle} ${toY}, ${toX} ${toY}`} fill="none" stroke="var(--ed-purple)" strokeWidth={2} strokeDasharray="4 5" />
        }))}
        {graph.items.flatMap(item => item.associations.map(association => {
          const source = appearances.get(item.id)?.[0]
          const target = appearances.get(association.targetId)?.[0]
          if (!source || !target) return null
          const sameColumn = source.x === target.x
          const fromX = sameColumn ? source.x + CARD_WIDTH / 2 : source.x < target.x ? source.x + CARD_WIDTH : source.x
          const toX = sameColumn ? target.x + CARD_WIDTH / 2 : source.x < target.x ? target.x : target.x + CARD_WIDTH
          const fromY = sameColumn ? source.y < target.y ? source.y + CARD_HEIGHT : source.y : source.y + CARD_HEIGHT / 2
          const toY = sameColumn ? source.y < target.y ? target.y : target.y + CARD_HEIGHT : target.y + CARD_HEIGHT / 2
          const middle = sameColumn ? (fromY + toY) / 2 : (fromX + toX) / 2
          const path = sameColumn
            ? `M ${fromX} ${fromY} C ${fromX} ${middle}, ${toX} ${middle}, ${toX} ${toY}`
            : `M ${fromX} ${fromY} C ${middle} ${fromY}, ${middle} ${toY}, ${toX} ${toY}`
          return <path key={`${item.id}:${association.id}`} d={path} fill="none" stroke="var(--primary)" strokeWidth={2} />
        }))}
        {cards.map(card => <g key={card.key}>
          <rect x={card.x} y={card.y} width={CARD_WIDTH} height={CARD_HEIGHT} rx={8} fill="var(--card)" stroke="var(--border)" />
          <foreignObject x={card.x + 8} y={card.y + 7} width={CARD_WIDTH - 16} height={CARD_HEIGHT - 14}>
            <div className="flex h-full items-center overflow-hidden font-display text-[20px] font-medium leading-tight text-foreground"><span className="line-clamp-2 break-words">{items.get(card.id)?.title || "Untitled note"}</span></div>
          </foreignObject>
        </g>)}
      </svg>
    </div>
  )
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
