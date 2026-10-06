// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PublishedGrid } from "@/components/project/published-grid"
import { getMyPublishedPage } from "@/lib/profile"
import { getPublicUserPublishedPage, getPublicUserUpvotedPage } from "@/lib/public-profile"
import type { ProjectFeedItem } from "@/lib/public-project"
import { PAGE_SIZE } from "@/lib/config"

export function PublishedPanel({
  initialItems,
  initialHasMore,
  username,
  kind = "published",
  emptyMessage,
}: {
  initialItems: ProjectFeedItem[]
  initialHasMore: boolean
  username?: string
  kind?: "published" | "upvoted"
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
      const result = !username
        ? await getMyPublishedPage(page, PAGE_SIZE)
        : kind === "upvoted"
          ? await getPublicUserUpvotedPage(username, page, PAGE_SIZE)
          : await getPublicUserPublishedPage(username, page, PAGE_SIZE)
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
