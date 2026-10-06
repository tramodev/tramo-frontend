// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ExploreCard } from "@/components/feed/explore-card"
import { getExploreBundle, type FeedSort, type ProjectFeedItem } from "@/lib/public-project"
import { EXPLORE_PAGE_SIZE } from "@/lib/config"

export function ExploreFeed({
  initialItems,
  initialHasMore,
  featuredId,
  query,
  sort,
  loggedIn,
  username,
}: {
  initialItems: ProjectFeedItem[]
  initialHasMore: boolean
  featuredId?: string
  query?: string
  sort: FeedSort
  loggedIn: boolean
  username: string | null
}) {
  const [items, setItems] = useState(() => initialItems.filter((project) => project.id !== featuredId))
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLoadMore() {
    if (isLoading) return
    setIsLoading(true)
    try {
      const bundle = await getExploreBundle(query, sort, page, EXPLORE_PAGE_SIZE)
      setItems((prev) => [...prev, ...bundle.feed.filter((project) => project.id !== featuredId)])
      setPage((prev) => prev + 1)
      setHasMore(bundle.hasMore)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {items.length === 0 && (
        <div className="min-h-[325px]">
          <p className="text-sm text-muted-foreground">
            {query
              ? `Nothing found for "${query}".`
              : sort === "following"
                ? "Nothing here yet — follow people to see what they publish."
                : "Nothing published yet."}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {items.map((project) => (
          <ExploreCard key={project.id} project={project} loggedIn={loggedIn} username={username} />
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
