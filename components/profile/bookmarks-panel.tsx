"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, ArrowBigUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ForkButton } from "@/components/fork-button"
import { BookmarkButton } from "@/components/bookmark-button"
import { Row, Thumbnail, EmptyState } from "@/components/profile/row"
import { getMyBookmarksPage } from "@/lib/profile"
import type { ProjectFeedItem } from "@/lib/public-project"
import { PAGE_SIZE } from "@/lib/config"

export function BookmarksPanel({
  initialItems,
  initialHasMore,
  loggedIn,
}: {
  initialItems: ProjectFeedItem[]
  initialHasMore: boolean
  loggedIn: boolean
}) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLoadMore() {
    if (isLoading) return
    setIsLoading(true)
    try {
      const result = await getMyBookmarksPage(page, PAGE_SIZE)
      setItems((prev) => [...prev, ...result.items])
      setPage((prev) => prev + 1)
      setHasMore(result.hasMore)
    } finally {
      setIsLoading(false)
    }
  }

  if (items.length === 0) {
    return <EmptyState message="Nothing saved yet — bookmark paths from" linkHref="/explore" linkLabel="Explore." />
  }

  return (
    <>
      <div className="flex flex-col">
        {items.map((item) => (
          <Row key={item.id}>
            <Link href={`/p/${item.id}`} className="absolute inset-0 z-0" aria-label={item.title} />
            <Thumbnail thumbnail={item.thumbnail} title={item.title} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 font-display text-xl font-medium">{item.title}</div>
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <a
                  href={`/u/${encodeURIComponent(item.ownerUsername)}`}
                  className="relative z-10 font-medium text-muted-foreground hover:text-primary"
                >
                  by {item.ownerUsername}
                </a>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-[13px] w-[13px]" />
                  {item.viewCount.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ArrowBigUp className="h-[13px] w-[13px]" />
                  {item.voteCount.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ForkButton projectId={item.id} isLoggedIn={loggedIn} variant="filled" />
              <BookmarkButton projectId={item.id} initialBookmarked={item.bookmarkedByRequester} isLoggedIn={loggedIn} />
            </div>
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
