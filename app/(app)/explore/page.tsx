import Link from "next/link"
import { Check, Eye, MessageCircle, Search } from "lucide-react"
import { VoteButton } from "@/components/vote-button"
import { BookmarkButton } from "@/components/bookmark-button"
import { PostOptionsMenu } from "@/components/post-options-menu"
import { AuthorAvatar, initial } from "@/components/author-avatar"
import { ExploreFeed } from "@/components/explore-feed"
import { getExploreBundle, type FeedSort } from "@/lib/public-project"
import { isLoggedIn, getUsername } from "@/lib/auth"

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { q, sort: sortParam } = await searchParams
  const sort: FeedSort = sortParam === "hot" ? "hot" : sortParam === "following" ? "following" : "recent"
  const [bundle, loggedIn, username] = await Promise.all([
    getExploreBundle(q, sort),
    isLoggedIn(),
    getUsername(),
  ])

  const { featured, hotTopics, activeAuthors } = bundle
  const hasSidebar = hotTopics.length > 0 || activeAuthors.length > 0

  return (
    <main className="mx-auto w-full flex-1 max-w-[1216px]">
      <div className="flex items-end justify-between gap-8 pt-9 px-18 pb-0">
        <div>
          <span className="block text-sm font-medium text-primary mb-2">
            The commons
          </span>
          <h1 className="font-display text-[44px] font-normal leading-[1.1]">
            Explore
          </h1>
        </div>
        <form action="/explore" method="get" className="flex items-center gap-4">
          <input type="hidden" name="sort" value={sort} />
          <div className="relative w-[340px]">
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
        <div className="relative grid items-center mt-7 mx-18 py-9 px-10 grid-cols-[1fr_400px] gap-12 rounded-[28px] bg-card">
          <Link href={`/p/${featured.id}`} className="absolute inset-0 z-0" aria-label={featured.title} />

          <div>
            <span className="block text-[13px] font-medium text-primary mb-3">
              Featured today
            </span>
            <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground mb-3.5">
              <AuthorAvatar username={featured.ownerUsername} avatar={featured.ownerAvatar} />
              <Link href={`/u/${encodeURIComponent(featured.ownerUsername)}`} className="relative z-10 font-medium text-foreground">
                {featured.ownerUsername}
              </Link>
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
              <div className="flex gap-2">
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
                <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Eye className="h-[17px] w-[17px]" />
                  {featured.viewCount.toLocaleString('en-US')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
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
                />
              </div>
            </div>
          </div>
          <div className="grid place-items-center overflow-hidden rounded-[20px] h-[250px] bg-accent">
            {featured.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featured.thumbnail}
                alt=""
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <span className="font-display text-[84px] font-medium text-accent-foreground leading-none">
                {initial(featured.title)}
              </span>
            )}
          </div>
        </div>
      )}

      <div
        className={
          hasSidebar
            ? "grid grid-cols-1 gap-12 pt-9 px-18 pb-14 lg:grid-cols-[minmax(0,1fr)_272px]"
            : "flex gap-12 pt-9 px-18 pb-14"
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
            {hotTopics.length > 0 && (
              <div className="rounded-2xl bg-card p-5">
                <h3 className="text-[13px] font-medium text-muted-foreground">
                  Hot topics
                </h3>
                <div className="mt-2 flex flex-col">
                  {hotTopics.map(({ tag, count }) => (
                    <Link
                      key={tag}
                      href={`/explore?q=${encodeURIComponent(tag)}`}
                      className="flex items-center justify-between rounded-full px-3 py-2.5 text-sm transition-colors hover:bg-surface-container-high"
                    >
                      <span>{tag}</span>
                      <span className="text-xs text-muted-foreground">
                        {count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {activeAuthors.length > 0 && (
              <div className="rounded-2xl bg-card p-5">
                <h3 className="text-[13px] font-medium text-muted-foreground">
                  Active authors
                </h3>
                <div className="mt-2 flex flex-col">
                  {activeAuthors.map(({ username, avatar, count }) => (
                    <Link
                      key={username}
                      href={`/u/${encodeURIComponent(username)}`}
                      className="flex items-center gap-2.5 rounded-full px-3 py-2 text-sm transition-colors hover:bg-surface-container-high"
                    >
                      <AuthorAvatar username={username} avatar={avatar} size={28} />
                      <span className="min-w-0 flex-1 truncate">{username}</span>
                      <span className="text-xs text-muted-foreground">
                        {count}
                      </span>
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
