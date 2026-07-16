"use client"

import { useState } from "react"
import Link from "next/link"
import { GitFork } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Row, Thumbnail, EmptyState } from "@/components/profile/row"
import { getMyForksPage } from "@/lib/profile"
import type { ForkFeedItem } from "@/lib/profile"
import { PAGE_SIZE } from "@/lib/config"

export function ForksPanel({
  initialItems,
  initialHasMore,
}: {
  initialItems: ForkFeedItem[]
  initialHasMore: boolean
}) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLoadMore() {
    if (isLoading) return
    setIsLoading(true)
    try {
      const result = await getMyForksPage(page, PAGE_SIZE)
      setItems((prev) => [...prev, ...result.items])
      setPage((prev) => prev + 1)
      setHasMore(result.hasMore)
    } finally {
      setIsLoading(false)
    }
  }

  if (items.length === 0) {
    return <EmptyState message="No forks yet — fork a path from" linkHref="/explore" linkLabel="Explore." />
  }

  return (
    <>
      <div className="flex flex-col">
        {items.map((item) => (
          <Row key={item.id}>
            <Link href={`/editor/${item.id}`} className="absolute inset-0 z-0" aria-label={item.title} />
            <Thumbnail thumbnail={item.thumbnail} title={item.title} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 font-display text-xl font-medium">{item.title}</div>
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <GitFork className="h-[11px] w-[11px]" />
                {item.forkedFromOwnerUsername ? (
                  <span>
                    forked from{" "}
                    <a
                      href={`/u/${encodeURIComponent(item.forkedFromOwnerUsername)}`}
                      className="relative z-10 font-medium text-muted-foreground hover:text-primary"
                    >
                      {item.forkedFromOwnerUsername}
                    </a>
                  </span>
                ) : (
                  <span>source no longer available</span>
                )}
              </div>
            </div>
            <Link
              href={`/editor/${item.id}`}
              className="relative z-10 shrink-0 rounded-full text-[13px] font-medium transition-colors border border-input text-muted-foreground hover:bg-muted hover:text-foreground py-2 px-4"
            >
              Open
            </Link>
          </Row>
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={handleLoadMore} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </>
  )
}
