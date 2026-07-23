"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FollowButton } from "@/components/social/follow-button"
import { getFollowersPage, getFollowingPage, type FollowUser } from "@/lib/public-profile"

function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

export function FollowListPanel({
  username,
  mode,
  initialItems,
  initialHasMore,
  loggedIn,
  currentUsername,
  pageSize,
  emptyMessage,
}: {
  username: string
  mode: "followers" | "following"
  initialItems: FollowUser[]
  initialHasMore: boolean
  loggedIn: boolean
  currentUsername: string | null
  pageSize: number
  emptyMessage: string
}) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLoadMore() {
    if (isLoading) return
    setIsLoading(true)
    try {
      const fetchPage = mode === "followers" ? getFollowersPage : getFollowingPage
      const result = await fetchPage(username, page, pageSize)
      setItems((prev) => [...prev, ...result.items])
      setPage((prev) => prev + 1)
      setHasMore(result.hasMore)
    } finally {
      setIsLoading(false)
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <>
      <div className="flex flex-col">
        {items.map((item) => (
          <div key={item.username} className="relative flex items-center gap-4 rounded-2xl transition-colors hover:bg-card -mx-4 py-3 px-4">
            <Link href={`/u/${encodeURIComponent(item.username)}`} className="absolute inset-0 z-0" aria-label={item.username} />
            <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-lg font-medium w-12 h-12 bg-primary text-primary-foreground">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial(item.username)
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{item.username}</div>
              {item.bio && <div className="truncate text-xs text-muted-foreground">{item.bio}</div>}
            </div>
            {item.username.toLowerCase() !== currentUsername?.toLowerCase() && (
              <div className="relative z-10 shrink-0">
                <FollowButton username={item.username} initialFollowing={item.followingByRequester} isLoggedIn={loggedIn} />
              </div>
            )}
          </div>
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
