import Link from "next/link"
import { Eye, Search } from "lucide-react"
import { VoteButton } from "@/components/vote-button"
import { BookmarkButton } from "@/components/bookmark-button"
import { PostOptionsMenu } from "@/components/post-options-menu"
import { getPublishedFeed, getHotTopics, type FeedSort } from "@/lib/public-project"
import { isLoggedIn, getUsername } from "@/lib/auth"

function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { q, sort: sortParam } = await searchParams
  const sort: FeedSort = sortParam === "hot" ? "hot" : "recent"
  const [feed, allProjects, hotTopics, loggedIn, username] = await Promise.all([
    getPublishedFeed(q, sort),
    getPublishedFeed(undefined, "hot"),
    getHotTopics(),
    isLoggedIn(),
    getUsername(),
  ])

  const featured = allProjects.find((project) => project.featured) ?? null
  const projects = feed.filter((project) => project.id !== featured?.id)

  const authorCounts = new Map<string, number>()
  for (const project of allProjects) {
    authorCounts.set(project.ownerUsername, (authorCounts.get(project.ownerUsername) ?? 0) + 1)
  }
  const activeAuthors = [...authorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([username, count]) => ({ username, count }))

  return (
    <main className="mx-auto w-full flex-1" style={{ maxWidth: 1216 }}>
        <div
          className="flex items-end justify-between gap-8"
          style={{ padding: "44px 72px 0" }}
        >
          <div>
            <span
              className="block text-[11px] font-bold uppercase"
              style={{ letterSpacing: "0.12em", color: "var(--color-accent)", marginBottom: "8px" }}
            >
              The commons
            </span>
            <h1 className="text-[48px] font-extrabold" style={{ letterSpacing: "-0.025em", lineHeight: 1.05 }}>
              Explore
            </h1>
          </div>
          <form
            action="/explore"
            method="get"
            className="flex items-center gap-3.5"
            style={{ paddingBottom: "6px" }}
          >
            <input type="hidden" name="sort" value={sort} />
            <div className="relative" style={{ width: 340 }}>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-[15px] w-[15px] -translate-y-1/2"
                style={{ color: "var(--color-neutral-600)" }}
              />
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search published projects..."
                className="w-full rounded-lg border-2 text-sm outline-none"
                style={{
                  borderColor: "var(--color-divider)",
                  background: "var(--color-bg)",
                  padding: "8px 12px 8px 36px",
                }}
              />
            </div>
            <div className="flex items-center gap-5">
              {(
                [
                  ["recent", "Recent"],
                  ["hot", "Hot"],
                ] as const
              ).map(([value, label]) => (
                <Link
                  key={value}
                  href={`/explore?${new URLSearchParams({ ...(q ? { q } : {}), sort: value }).toString()}`}
                  className="pb-1 text-[13px] font-bold transition-colors"
                  style={{
                    color: sort === value ? "var(--color-text)" : "var(--color-neutral-600)",
                    borderBottom: sort === value ? "2px solid var(--color-accent)" : "2px solid transparent",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </form>
        </div>
        <div style={{ margin: "28px 72px 0", height: 2, background: "var(--color-divider)" }} />

        {featured && (
          <>
            <div
              className="relative grid items-center"
              style={{ margin: "0 72px", padding: "36px 0", gridTemplateColumns: "1fr 400px", gap: 56 }}
            >
              <Link href={`/p/${featured.id}`} className="absolute inset-0 z-0" aria-label={featured.title} />
              <PostOptionsMenu
                projectId={featured.id}
                ownerUsername={featured.ownerUsername}
                isLoggedIn={loggedIn}
                isOwnPost={featured.ownerUsername === username}
                className="absolute top-2 right-2 z-10"
              />
              <div>
                <span
                  className="block text-[11px] font-bold uppercase"
                  style={{ letterSpacing: "0.12em", color: "var(--color-accent)", marginBottom: "10px" }}
                >
                  Featured today
                </span>
                <h2
                  className="text-[32px] font-extrabold"
                  style={{ letterSpacing: "-0.02em", lineHeight: 1.12, marginBottom: "10px" }}
                >
                  {featured.title}
                </h2>
                <div
                  className="flex items-center gap-2.5 text-[13px]"
                  style={{ color: "var(--color-neutral-600)", marginBottom: "14px" }}
                >
                  <span
                    className="inline-flex items-center justify-center text-[11px] font-extrabold"
                    style={{ width: 22, height: 22, background: "var(--color-text)", color: "var(--color-bg)" }}
                  >
                    {initial(featured.ownerUsername)}
                  </span>
                  <Link href={`/u/${encodeURIComponent(featured.ownerUsername)}`} className="relative z-10 font-semibold hover:text-[var(--color-accent)]" style={{ color: "var(--color-text)" }}>
                    {featured.ownerUsername}
                  </Link>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {featured.viewCount.toLocaleString()}
                  </span>
                </div>
                {featured.description && (
                  <p
                    className="text-[15px]"
                    style={{ lineHeight: 1.6, color: "var(--color-neutral-800)", maxWidth: "62ch", marginBottom: "16px" }}
                  >
                    {featured.description}
                  </p>
                )}
                <div className="flex items-center gap-5">
                  {featured.tags.length > 0 && (
                    <div className="flex gap-1.5">
                      {featured.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ background: "var(--color-neutral-200)", color: "var(--color-neutral-800)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <VoteButton
                      projectId={featured.id}
                      initialVoted={featured.votedByRequester}
                      initialCount={featured.voteCount}
                      isLoggedIn={loggedIn}
                    />
                    <BookmarkButton
                      projectId={featured.id}
                      initialBookmarked={featured.bookmarkedByRequester}
                      isLoggedIn={loggedIn}
                    />
                  </div>
                </div>
              </div>
              <div
                className="grid place-items-center overflow-hidden rounded-lg"
                style={{ height: 250, border: "2px solid var(--color-divider)", background: "var(--color-neutral-200)" }}
              >
                {featured.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featured.thumbnail}
                    alt=""
                    className="h-full w-full rounded-lg object-cover object-top"
                  />
                ) : (
                  <span className="text-[84px] font-extrabold" style={{ color: "var(--color-accent)", lineHeight: 1 }}>
                    {initial(featured.title)}
                  </span>
                )}
              </div>
            </div>
            <div style={{ margin: "0 72px", height: 2, background: "var(--color-divider)" }} />
          </>
        )}

        <div className="flex gap-14" style={{ padding: "36px 72px 56px" }}>
          <div className="min-w-0 flex-1">
            <div
              className="text-[11px] font-bold uppercase"
              style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)", marginBottom: "8px" }}
            >
              Recently published
            </div>
            {projects.length === 0 && (
              <p className="text-sm" style={{ color: "var(--color-neutral-600)" }}>
                {q ? `Nothing found for "${q}".` : "Nothing published yet."}
              </p>
            )}
            <div className="flex flex-col">
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  className="relative grid items-center rounded-lg transition-colors hover:bg-muted"
                  style={{
                    gridTemplateColumns: "40px 1fr auto",
                    gap: 20,
                    margin: "0 -16px",
                    padding: "22px 16px",
                    borderBottom: "2px solid var(--color-divider)",
                  }}
                >
                  <Link href={`/p/${project.id}`} className="absolute inset-0 z-0" aria-label={project.title} />
                  <PostOptionsMenu
                    projectId={project.id}
                    ownerUsername={project.ownerUsername}
                    isLoggedIn={loggedIn}
                    isOwnPost={project.ownerUsername === username}
                    className="absolute top-2 right-2 z-10"
                  />
                  <span className="text-sm font-bold" style={{ color: "var(--color-accent)" }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="mb-1 text-[20px] font-bold" style={{ lineHeight: 1.2 }}>
                      {project.title}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs" style={{ color: "var(--color-neutral-600)" }}>
                      <Link
                        href={`/u/${encodeURIComponent(project.ownerUsername)}`}
                        className="relative z-10 font-semibold hover:text-[var(--color-accent)]"
                        style={{ color: "var(--color-neutral-700)" }}
                      >
                        {project.ownerUsername}
                      </Link>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-[13px] w-[13px]" />
                        {project.viewCount.toLocaleString()}
                      </span>
                      {project.tags.length > 0 && (
                        <>
                          <span style={{ color: "var(--color-divider)" }}>·</span>
                          <span>{project.tags.join(" · ")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-end gap-4 self-end">
                    <div
                      className="grid place-items-center overflow-hidden rounded-md"
                      style={{ width: 96, height: 64, border: "2px solid var(--color-divider)", background: "var(--color-neutral-200)" }}
                    >
                      {project.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.thumbnail}
                          alt=""
                          className="h-full w-full rounded-md object-cover object-top"
                        />
                      ) : (
                        <span className="text-2xl font-extrabold" style={{ color: "var(--color-accent)" }}>
                          {initial(project.title)}
                        </span>
                      )}
                    </div>
                    <VoteButton
                      projectId={project.id}
                      initialVoted={project.votedByRequester}
                      initialCount={project.voteCount}
                      isLoggedIn={loggedIn}
                    />
                    <BookmarkButton
                      projectId={project.id}
                      initialBookmarked={project.bookmarkedByRequester}
                      isLoggedIn={loggedIn}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(hotTopics.length > 0 || activeAuthors.length > 0) && (
            <aside className="hidden flex-shrink-0 flex-col gap-7 lg:flex" style={{ width: 272 }}>
              {hotTopics.length > 0 && (
                <div className="p-4">
                  <h3
                    className="text-[11px] font-bold uppercase"
                    style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
                  >
                    Hot topics
                  </h3>
                  <div className="mt-3 flex flex-col">
                    {hotTopics.map(({ tag, count }) => (
                      <Link
                        key={tag}
                        href={`/explore?q=${encodeURIComponent(tag)}`}
                        className="flex items-center justify-between px-2 py-2 text-sm transition-colors hover:bg-muted"
                        style={{ borderBottom: "2px solid var(--color-divider)" }}
                      >
                        <span>{tag}</span>
                        <span className="text-xs" style={{ color: "var(--color-neutral-600)" }}>
                          {count}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {activeAuthors.length > 0 && (
                <div className="p-4">
                  <h3
                    className="text-[11px] font-bold uppercase"
                    style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
                  >
                    Active authors
                  </h3>
                  <div className="mt-3 flex flex-col">
                    {activeAuthors.map(({ username, count }) => (
                      <Link
                        key={username}
                        href={`/u/${encodeURIComponent(username)}`}
                        className="flex items-center gap-2.5 px-2 py-2 text-sm transition-colors hover:bg-muted"
                        style={{ borderBottom: "2px solid var(--color-divider)" }}
                      >
                        <span
                          className="inline-flex shrink-0 items-center justify-center text-xs font-extrabold"
                          style={{ width: 26, height: 26, background: "var(--color-text)", color: "var(--color-bg)" }}
                        >
                          {initial(username)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{username}</span>
                        <span className="text-xs" style={{ color: "var(--color-neutral-600)" }}>
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
