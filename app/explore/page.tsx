import Link from "next/link"
import { Search } from "lucide-react"
import { archivo } from "@/lib/fonts"
import "../modernist.css"
import { Wordmark } from "@/components/logo"
import { UserMenu } from "@/components/user-menu"
import { VoteButton } from "@/components/vote-button"
import { getPublishedFeed, getHotTopics, type FeedSort } from "@/lib/public-project"
import { getHomeHref } from "@/lib/nav"
import { isLoggedIn } from "@/lib/auth"
import { Footer } from "@/components/footer"

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { q, sort: sortParam } = await searchParams
  const sort: FeedSort = sortParam === "hot" ? "hot" : "recent"
  const [projects, hotTopics, homeHref, loggedIn] = await Promise.all([
    getPublishedFeed(q, sort),
    getHotTopics(),
    getHomeHref(),
    isLoggedIn(),
  ])

  return (
    <div className={`modernist flex min-h-svh flex-col ${archivo.className}`}>
      <header
        className="flex items-center gap-4"
        style={{ borderBottom: "2px solid var(--color-divider)", padding: "18px 40px" }}
      >
        <Link href={homeHref}>
          <Wordmark />
        </Link>
        <span
          className="text-[13px] uppercase"
          style={{ letterSpacing: "0.08em", color: "var(--color-neutral-700)" }}
        >
          Explore
        </span>
        <div className="ml-auto">
          <UserMenu />
        </div>
      </header>
      <main className="mx-auto w-full flex-1" style={{ maxWidth: 1216, padding: "40px 72px 84px" }}>
        <form action="/explore" method="get" className="mb-8 max-w-[480px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--color-neutral-600)" }}
            />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search published projects..."
              className="w-full rounded-lg border-2 py-2 pr-3 pl-9 text-sm outline-none"
              style={{ borderColor: "var(--color-divider)", background: "var(--color-bg)" }}
            />
          </div>
        </form>

        <div className="mb-6 flex gap-6" style={{ borderBottom: "2px solid var(--color-divider)" }}>
          {(
            [
              ["recent", "Recent"],
              ["hot", "Hot"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={`/explore?${new URLSearchParams({ ...(q ? { q } : {}), sort: value }).toString()}`}
              className="-mb-[2px] pb-2 text-sm font-bold transition-colors"
              style={{
                color: sort === value ? "var(--color-text)" : "var(--color-neutral-600)",
                borderBottom: sort === value ? "2px solid var(--color-accent)" : "2px solid transparent",
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex gap-12">
          <div className="min-w-0 flex-1">
            {projects.length === 0 && (
              <p className="text-sm" style={{ color: "var(--color-neutral-600)" }}>
                {q ? `Nothing found for "${q}".` : "Nothing published yet."}
              </p>
            )}
            <div className="flex flex-col">
              {projects.map((project) => (
                <a
                  key={project.id}
                  href={`/p/${project.id}`}
                  className="-mx-4 flex items-center justify-between gap-6 rounded-lg px-4 py-6 transition-colors hover:bg-muted"
                  style={{ borderBottom: "2px solid var(--color-divider)" }}
                >
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <h2 className="text-[20px] font-bold">{project.title}</h2>
                    <p className="text-xs" style={{ color: "var(--color-neutral-600)" }}>
                      by {project.ownerUsername}
                    </p>
                    {project.description && (
                      <p
                        className="mt-1 line-clamp-2 text-[15px]"
                        style={{ color: "var(--color-neutral-800)" }}
                      >
                        {project.description}
                      </p>
                    )}
                    {project.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {project.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full px-2 py-0.5 text-[11px]"
                            style={{ background: "var(--color-neutral-200)", color: "var(--color-neutral-800)" }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {project.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.thumbnail}
                        alt=""
                        className="h-20 w-28 shrink-0 rounded-md object-cover object-top"
                        style={{ border: "2px solid var(--color-divider)" }}
                      />
                    )}
                    <VoteButton
                      projectId={project.id}
                      initialVoted={project.votedByRequester}
                      initialCount={project.voteCount}
                      isLoggedIn={loggedIn}
                    />
                  </div>
                </a>
              ))}
            </div>
          </div>

          {hotTopics.length > 0 && (
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="rounded-lg border-2 p-4" style={{ borderColor: "var(--color-divider)" }}>
                <h3
                  className="text-[11px] font-bold uppercase"
                  style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
                >
                  Hot topics
                </h3>
                <div className="mt-3 flex flex-col gap-1">
                  {hotTopics.map(({ tag, count }) => (
                    <a
                      key={tag}
                      href={`/explore?q=${encodeURIComponent(tag)}`}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                    >
                      <span>{tag}</span>
                      <span className="text-xs" style={{ color: "var(--color-neutral-600)" }}>
                        {count}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
