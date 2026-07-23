"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { VoteButton } from "@/components/social/vote-button"
import { Row, Thumbnail, EmptyState } from "@/components/profile/row"
import { getMyUpvotedPage } from "@/lib/profile"
import type { ProjectFeedItem } from "@/lib/public-project"
import { PAGE_SIZE } from "@/lib/config"

export function UpvotedPanel({
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
      const result = await getMyUpvotedPage(page, PAGE_SIZE)
      setItems((prev) => [...prev, ...result.items])
      setPage((prev) => prev + 1)
      setHasMore(result.hasMore)
    } finally {
      setIsLoading(false)
    }
  }

  if (items.length === 0) {
    return <EmptyState message="Nothing upvoted yet — find paths worth voting for on" linkHref="/explore" linkLabel="Explore." />
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
              <div className="text-xs text-muted-foreground">
                by{" "}
                <a
                  href={`/u/${encodeURIComponent(item.ownerUsername)}`}
                  className="relative z-10 font-medium text-muted-foreground hover:text-primary"
                >
                  {item.ownerUsername}
                </a>
              </div>
            </div>
            <VoteButton
              projectId={item.id}
              initialVoted={item.votedByRequester}
              initialCount={item.voteCount}
              isLoggedIn={loggedIn}
            />
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
