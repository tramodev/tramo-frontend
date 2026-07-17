"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VoteButton } from "@/components/vote-button"
import { BookmarkButton } from "@/components/bookmark-button"
import { PostOptionsMenu } from "@/components/post-options-menu"
import { AuthorAvatar, initial } from "@/components/author-avatar"
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
        <p className="text-sm text-muted-foreground">
          {query ? `Nothing found for "${query}".` : "Nothing published yet."}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {items.map((project) => (
          <div
            key={project.id}
            className="relative flex justify-between gap-5 rounded-lg border border-border bg-popover p-6 transition-shadow hover:shadow-elevation-1"
          >
            <Link href={`/p/${project.id}`} className="absolute inset-0 z-0" aria-label={project.title} />

            <div className="min-w-0 w-full">
              <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground mb-3">
                <AuthorAvatar username={project.ownerUsername} avatar={project.ownerAvatar} />
                <Link href={`/u/${encodeURIComponent(project.ownerUsername)}`} className="relative z-10 font-medium text-foreground">
                  {project.ownerUsername}
                </Link>
              </div>
              <div className="mb-2 font-display text-[22px] font-medium leading-[1.25]">
                {project.title}
              </div>
              {project.description && (
                <p className="mb-3.5 text-[15px] leading-[1.6] text-muted-foreground max-w-[70ch] line-clamp-2">
                  {project.description}
                </p>
              )}

              {project.tags.length > 0 && (
                <div className="flex gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm border border-border px-3 py-[5px] text-xs font-medium text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex justify-between mt-3.5">
                <div className="flex items-center gap-3.5">
                  <VoteButton
                    projectId={project.id}
                    initialVoted={project.votedByRequester}
                    initialCount={project.voteCount}
                    isLoggedIn={loggedIn}
                  />
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <Eye className="h-[17px] w-[17px]" />
                    {project.viewCount.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <MessageCircle className="h-[15px] w-[15px]" />
                    0
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <BookmarkButton
                    projectId={project.id}
                    initialBookmarked={project.bookmarkedByRequester}
                    isLoggedIn={loggedIn}
                  />
                  <PostOptionsMenu
                    projectId={project.id}
                    ownerUsername={project.ownerUsername}
                    isLoggedIn={loggedIn}
                    isOwnPost={project.ownerUsername === username}
                  />
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-4 self-center">
              <div className="grid place-items-center overflow-hidden rounded-lg w-[156px] h-[128px] bg-surface-container-high">
                {project.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.thumbnail}
                    alt=""
                    className="h-full w-full scale-[1.15] object-cover object-top"
                  />
                ) : (
                  <span className="font-display text-2xl font-medium text-primary">
                    {initial(project.title)}
                  </span>
                )}
              </div>
            </div>
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
