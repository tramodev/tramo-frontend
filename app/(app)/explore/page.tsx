// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import Link from "next/link"
import { Check, Eye, MessageCircle, Search } from "lucide-react"
import { VoteButton } from "@/components/social/vote-button"
import { BookmarkButton } from "@/components/social/bookmark-button"
import { PostOptionsMenu } from "@/components/project/post-options-menu"
import { AuthorAvatar, initial } from "@/components/shared/author-avatar"
import { ProjectThumbnail } from "@/components/project/project-thumbnail"
import { ExploreFeed } from "@/components/feed/explore-feed"
import { PatreonSupportCard } from "@/components/feed/patreon-support-card"
import { ProfileHoverCard } from "@/components/social/profile-hover-card"
import { NameBadge } from "@/components/profile/badges-panel"
import { getExploreBundle, type FeedSort } from "@/lib/public-project"
import { isLoggedIn, getUsername } from "@/lib/auth"
import { getSubscriptionStatus } from "@/lib/subscription"

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover trails and projects published by the Tramo community.",
  alternates: { canonical: "/explore" },
}

function formatCardDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { q, sort: sortParam } = await searchParams
  const sort: FeedSort = sortParam === "hot" ? "hot" : sortParam === "following" ? "following" : "recent"
  const loggedIn = await isLoggedIn()
  const [bundle, username, subscription] = await Promise.all([
    getExploreBundle(q, sort),
    getUsername(),
    loggedIn ? getSubscriptionStatus().catch(() => null) : Promise.resolve(null),
  ])

  const { featured, hotTopics, activeAuthors, trendingProjects } = bundle
  const showSupportCard = loggedIn && !subscription?.supporter
  const hasSidebar = hotTopics.length > 0 || activeAuthors.length > 0 || trendingProjects.length > 0 || showSupportCard

  return (
    <main className="mx-auto w-full flex-1 max-w-[1216px]">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8 pt-9 px-6 md:px-18 pb-0">
        <div>
          <span className="block text-sm font-medium text-primary mb-2">
            The commons
          </span>
          <h1 className="font-display text-[44px] font-normal leading-[1.1]">
            Explore
          </h1>
        </div>
        <form action="/explore" method="get" className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <input type="hidden" name="sort" value={sort} />
          <div className="relative w-full md:w-[340px]">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search published projects"
              className="h-12 w-full rounded-full border-0 bg-surface-container-high pl-[46px] pr-5 text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus:bg-surface-container-highest"
            />
          </div>
          <div className="flex h-10 items-center overflow-hidden rounded-full border border-input">
            {(
              loggedIn
                ? ([
                    ["recent", "Recent"],
                    ["hot", "Hot"],
                    ["following", "Following"],
                  ] as const)
                : ([
                    ["recent", "Recent"],
                    ["hot", "Hot"],
                  ] as const)
            ).map(([value, label], i) => (
              <span key={value} className="flex h-full items-center">
                {i > 0 && <span className="h-full w-px bg-input" />}
                <Link
                  href={`/explore?${new URLSearchParams({ ...(q ? { q } : {}), sort: value }).toString()}`}
                  className={`flex h-full items-center gap-1.5 px-[18px] text-[13px] font-medium transition-colors ${
                    sort === value
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {sort === value && <Check className="h-3 w-3" strokeWidth={2.5} />}
                  {label}
                </Link>
              </span>
            ))}
          </div>
        </form>
      </div>

      {featured && (
        <div className="relative grid items-center mt-7 mx-6 md:mx-18 py-6 px-5 lg:py-9 lg:px-10 grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-12 rounded-[28px] bg-card">
          <Link href={`/p/${featured.id}`} className="absolute inset-0 z-0" aria-label={featured.title} />

          <div>
            <span className="block text-[13px] font-medium text-primary mb-3">
              Featured today
            </span>
            <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground mb-3.5">
              <ProfileHoverCard username={featured.ownerUsername} avatar={featured.ownerAvatar} isLoggedIn={loggedIn} viewerUsername={username}>
                <span className="relative z-10 flex items-center gap-2.5">
                  <AuthorAvatar username={featured.ownerUsername} avatar={featured.ownerAvatar} />
                  <span className="flex items-center gap-1">
                    <Link href={`/u/${encodeURIComponent(featured.ownerUsername)}`} className="font-medium text-foreground hover:underline">
                      {featured.ownerUsername}
                    </Link>
                    <NameBadge code={featured.ownerBadge} />
                  </span>
                </span>
              </ProfileHoverCard>
              {featured.publishedDate && (
                <span>
                  Published {formatCardDate(featured.publishedDate)}
                  {featured.lastPublishedDate && ` · Updated ${formatCardDate(featured.lastPublishedDate)}`}
                </span>
              )}
            </div>
            <h2 className="font-display text-[34px] font-normal leading-[1.2] mb-2.5">
              {featured.title}
            </h2>

            {featured.description && (
              <p className="text-base leading-[1.6] text-muted-foreground max-w-[62ch] mb-4">
                {featured.description}
              </p>
            )}

            {featured.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {featured.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-sm border border-border px-3 py-[5px] text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center mt-3.5">
              <div className="flex items-center gap-3.5">
                <VoteButton
                  projectId={featured.id}
                  initialVoted={featured.votedByRequester}
                  initialCount={featured.voteCount}
                  isLoggedIn={loggedIn}
                />
                <span className="inline-flex items-center px-2 text-[13px] text-muted-foreground">
                  <Eye className="h-[17px] w-[17px]" />
                  {featured.viewCount.toLocaleString('en-US')}
                </span>
                <span className="inline-flex items-center px-2 text-[13px] text-muted-foreground">
                  <MessageCircle className="h-[15px] w-[15px]" />
                  {featured.commentCount.toLocaleString('en-US')}
                </span>
              </div>
              <div className="flex items-center ml-auto gap-1 text-muted-foreground">
                <BookmarkButton
                  projectId={featured.id}
                  initialBookmarked={featured.bookmarkedByRequester}
                  isLoggedIn={loggedIn}
                />
                <PostOptionsMenu
                  projectId={featured.id}
                  ownerUsername={featured.ownerUsername}
                  isLoggedIn={loggedIn}
                  isOwnPost={featured.ownerUsername === username}
                  canFork={featured.canFork}
                />
              </div>
            </div>
          </div>
          <ProjectThumbnail
            thumbnailImageUrl={featured.thumbnailImageUrl}
            thumbnailGraph={featured.thumbnailGraph}
            title={featured.title}
            className="rounded-[20px] h-[250px] bg-accent"
            placeholder={
              <span className="font-display text-[84px] font-medium text-accent-foreground leading-none">
                {initial(featured.title)}
              </span>
            }
          />
        </div>
      )}

      <div
        className={
          hasSidebar
            ? "grid grid-cols-1 gap-12 pt-9 px-6 md:px-18 pb-14 lg:grid-cols-[minmax(0,1fr)_272px]"
            : "flex gap-12 pt-9 px-6 md:px-18 pb-14"
        }
      >
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-muted-foreground mb-3">
            Recently published
          </div>
          <ExploreFeed
            key={`${sort}-${q ?? ""}`}
            initialItems={bundle.feed}
            initialHasMore={bundle.hasMore}
            featuredId={featured?.id}
            query={q}
            sort={sort}
            loggedIn={loggedIn}
            username={username}
          />
        </div>

        {hasSidebar && (
          <aside className="sticky top-6 hidden flex-col gap-5 self-start lg:flex">
            {showSupportCard && <PatreonSupportCard />}
            {trendingProjects.length > 0 && (
              <div className="overflow-hidden rounded-2xl bg-card p-5">
                <h3 className="text-xl font-semibold text-foreground">
                  Trending projects
                </h3>
                <div className="mt-2 flex flex-col">
                  {trendingProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/p/${project.id}`}
                      className="-mx-5 flex flex-col gap-1 px-5 py-2.5 transition-colors hover:bg-surface-container-high"
                    >
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="line-clamp-2 break-words text-sm font-medium">{project.title}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {project.ownerUsername}
                        </span>
                      </span>
                      {project.description && (
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {project.description}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {hotTopics.length > 0 && (
              <div className="rounded-2xl bg-card p-5">
                <h3 className="text-xl font-semibold text-foreground">
                  Popular topics
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {hotTopics.map(({ tag }) => (
                    <Link
                      key={tag}
                      href={`/explore?q=${encodeURIComponent(tag)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {activeAuthors.length > 0 && (
              <div className="overflow-hidden rounded-2xl bg-card p-5">
                <h3 className="text-xl font-semibold text-foreground">
                  Popular authors
                </h3>
                <div className="mt-2 flex flex-col">
                  {activeAuthors.map(({ username, avatar }) => (
                    <Link
                      key={username}
                      href={`/u/${encodeURIComponent(username)}`}
                      className="-mx-5 flex items-center gap-2.5 px-5 py-2 text-sm transition-colors hover:bg-surface-container-high"
                    >
                      <AuthorAvatar username={username} avatar={avatar} size={28} />
                      <span className="min-w-0 flex-1 truncate">{username}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </main>
  )
}
