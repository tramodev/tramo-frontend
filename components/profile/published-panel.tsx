"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PublishedGrid } from "@/components/published-grid"
import { getMyPublishedPage } from "@/lib/profile"
import { getPublicUserPublishedPage } from "@/lib/public-profile"
import type { ProjectFeedItem } from "@/lib/public-project"
import { PAGE_SIZE } from "@/lib/config"

export function PublishedPanel({
  initialItems,
  initialHasMore,
  username,
  emptyMessage,
}: {
  initialItems: ProjectFeedItem[]
  initialHasMore: boolean
  username?: string
  emptyMessage: React.ReactNode
}) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLoadMore() {
    if (isLoading) return
    setIsLoading(true)
    try {
      const result = username
        ? await getPublicUserPublishedPage(username, page, PAGE_SIZE)
        : await getMyPublishedPage(page, PAGE_SIZE)
      setItems((prev) => [...prev, ...result.items])
      setPage((prev) => prev + 1)
      setHasMore(result.hasMore)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <PublishedGrid
        items={items}
        hrefFor={(id) => (username ? `/p/${id}` : `/editor/${id}`)}
        emptyMessage={emptyMessage}
      />
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
