// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ExploreCard } from "@/components/feed/explore-card"
import { getExploreBundle, type FeedSort, type ProjectFeedItem } from "@/lib/public-project"
import { EXPLORE_PAGE_SIZE } from "@/lib/config"

export function ExploreFeed({
  initialItems,
  initialHasMore,
  initialCursor,
  featuredId,
  query,
  sort,
  loggedIn,
  username,
}: {
  initialItems: ProjectFeedItem[]
  initialHasMore: boolean
  initialCursor: string | null
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
  const [cursor, setCursor] = useState(initialCursor)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const pending = useRef(false)
  const focusId = useRef<string | null>(null)
  const status = useRef<HTMLParagraphElement>(null)

  async function handleLoadMore() {
    if (pending.current || !hasMore) return
    pending.current = true
    setIsLoading(true)
    setError("")
    setNotice("Loading more projects…")
    try {
      const bundle = await getExploreBundle(query, sort, cursor ? 0 : page, EXPLORE_PAGE_SIZE, cursor ?? undefined)
      const seen = new Set(items.map(project => project.id))
      const added = bundle.feed.filter(project => {
        if (project.id === featuredId || seen.has(project.id)) return false
        seen.add(project.id)
        return true
      })
      focusId.current = added[0]?.id ?? null
      setItems(previous => [...previous, ...added])
      setPage(previous => previous + 1)
      setCursor(bundle.nextCursor)
      setHasMore(bundle.hasMore)
      setNotice(`${added.length} project${added.length === 1 ? "" : "s"} added. ${items.length + added.length} projects shown.${bundle.hasMore ? "" : " All projects loaded."}`)
      if (!added.length && !bundle.hasMore) requestAnimationFrame(() => status.current?.focus({ preventScroll: true }))
    } catch {
      setError("Could not load more projects. Please try again.")
      setNotice("")
    } finally {
      pending.current = false
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
      <div className="flex flex-col gap-3" aria-busy={isLoading}>
        {items.map((project, index) => (
          <div key={project.id} ref={element => {
            if (element && focusId.current === project.id) {
              focusId.current = null
              requestAnimationFrame(() => element.querySelector<HTMLAnchorElement>("a")?.focus())
            }
          }}>
            <ExploreCard project={project} loggedIn={loggedIn} username={username} loading={index === 0 && !featuredId ? "eager" : "lazy"} />
          </div>
        ))}
      </div>

      <p ref={status} tabIndex={-1} role="status" aria-live="polite" aria-atomic="true" className="sr-only">{notice}</p>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={handleLoadMore} aria-disabled={isLoading}>
            {isLoading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </>
  )
}
