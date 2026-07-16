"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PublishedGrid } from "@/components/published-grid"
import { getMyPublishedPage } from "@/lib/profile"
import type { ProjectFeedItem } from "@/lib/public-project"
import { PAGE_SIZE } from "@/lib/config"

export function PublishedPanel({
  initialItems,
  initialHasMore,
}: {
  initialItems: ProjectFeedItem[]
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
      const result = await getMyPublishedPage(page, PAGE_SIZE)
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
        hrefFor={(id) => `/editor/${id}`}
        emptyMessage={
          <>
            Nothing published yet — publish a project from{" "}
            <Link href="/projects" className="font-medium text-primary">
              Projects.
            </Link>
          </>
        }
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
