"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowBigUp, Bookmark, GitFork, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Row, EmptyState } from "@/components/profile/row"
import { getMyActivityPage } from "@/lib/profile"
import type { ActivityItem } from "@/lib/profile"
import { PAGE_SIZE } from "@/lib/config"

const ACTIVITY_ICONS: Record<ActivityItem["type"], React.ComponentType<{ className?: string }>> = {
  published: Rocket,
  forked: GitFork,
  voted: ArrowBigUp,
  bookmarked: Bookmark,
  received_vote: ArrowBigUp,
  received_fork: GitFork,
  received_bookmark: Bookmark,
}

const ACTIVITY_CHIP_COLORS: Record<ActivityItem["type"], string> = {
  published: "bg-accent text-accent-foreground",
  voted: "bg-secondary text-secondary-foreground",
  received_vote: "bg-secondary text-secondary-foreground",
  forked: "bg-tertiary text-tertiary-foreground",
  received_fork: "bg-tertiary text-tertiary-foreground",
  bookmarked: "bg-surface-container-high text-muted-foreground",
  received_bookmark: "bg-surface-container-high text-muted-foreground",
}

const OWN_PROJECT_TYPES = new Set<ActivityItem["type"]>(["published", "forked", "received_vote", "received_fork", "received_bookmark"])

function activityHref(item: ActivityItem) {
  return OWN_PROJECT_TYPES.has(item.type) ? `/editor/${item.projectId}` : `/p/${item.projectId}`
}

function activityText(item: ActivityItem) {
  switch (item.type) {
    case "published":
      return <>You published <strong>{item.projectTitle}</strong></>
    case "forked":
      return item.otherUsername ? (
        <>You forked <strong>{item.projectTitle}</strong> from {item.otherUsername}</>
      ) : (
        <>You forked <strong>{item.projectTitle}</strong></>
      )
    case "voted":
      return <>You upvoted <strong>{item.projectTitle}</strong></>
    case "bookmarked":
      return <>You bookmarked <strong>{item.projectTitle}</strong></>
    case "received_vote":
      return <>{item.otherUsername} upvoted <strong>{item.projectTitle}</strong></>
    case "received_fork":
      return <>{item.otherUsername} forked <strong>{item.projectTitle}</strong></>
    case "received_bookmark":
      return <>{item.otherUsername} bookmarked <strong>{item.projectTitle}</strong></>
  }
}

function formatActivityDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function ActivityPanel({
  initialItems,
  initialHasMore,
}: {
  initialItems: ActivityItem[]
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
      const result = await getMyActivityPage(page, PAGE_SIZE)
      setItems((prev) => [...prev, ...result.items])
      setPage((prev) => prev + 1)
      setHasMore(result.hasMore)
    } finally {
      setIsLoading(false)
    }
  }

  if (items.length === 0) {
    return <EmptyState message="No activity yet — publish, fork, or upvote paths on" linkHref="/explore" linkLabel="Explore." />
  }

  return (
    <>
      <div className="flex flex-col">
        {items.map((item, index) => {
          const Icon = ACTIVITY_ICONS[item.type]
          return (
            <Row key={`${item.type}-${item.projectId}-${index}`}>
              <Link href={activityHref(item)} className="absolute inset-0 z-0" aria-label={item.projectTitle} />
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${ACTIVITY_CHIP_COLORS[item.type]}`}
              >
                <Icon className="h-[17px] w-[17px]" />
              </span>
              <div className="min-w-0 flex-1 text-sm">{activityText(item)}</div>
              <div className="shrink-0 text-xs text-muted-foreground">
                {formatActivityDate(item.timestamp)}
              </div>
            </Row>
          )
        })}
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
