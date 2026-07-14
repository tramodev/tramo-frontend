import Link from "next/link"
import { Eye, Search } from "lucide-react"
import { VoteButton } from "@/components/vote-button"
import { BookmarkButton } from "@/components/bookmark-button"
import { PostOptionsMenu } from "@/components/post-options-menu"
import { getExploreBundle, type FeedSort } from "@/lib/public-project"
import { isLoggedIn, getUsername } from "@/lib/auth"

function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

function AuthorAvatar({ username, avatar, size = 22 }: { username: string; avatar: string | null; size?: number }) {
  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-extrabold bg-(--color-text) text-(--color-bg) ${
        size > 22 ? "text-xs" : "text-[11px]"
      }`}
      style={{ width: size, height: size }}
    >
      {initial(username)}
    </span>
  )
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { q, sort: sortParam } = await searchParams
  const sort: FeedSort = sortParam === "hot" ? "hot" : "recent"
  const [bundle, loggedIn, username] = await Promise.all([
    getExploreBundle(q, sort),
    isLoggedIn(),
    getUsername(),
  ])

  const { featured, hotTopics, activeAuthors } = bundle
  const projects = bundle.feed.filter((project) => project.id !== featured?.id)

  return (
    <main className="mx-auto w-full flex-1 max-w-[1216px]">
      <div
        className="flex items-end justify-between gap-8 pt-11 px-18 pb-0"
      >
        <div>
          <span
            className="block text-[11px] font-bold uppercase tracking-[0.12em] text-(--color-accent) mb-2"
          >
            The commons
          </span>
          <h1 className="text-[48px] font-extrabold tracking-[-0.025em] leading-[1.05]">
            Explore
          </h1>
        </div>
        <form
          action="/explore"
          method="get"
          className="flex items-center gap-3.5 pb-1.5"
        >
          <input type="hidden" name="sort" value={sort} />
          <div className="relative w-[340px]">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-[15px] w-[15px] -translate-y-1/2 text-(--color-neutral-600)"
            />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search published projects..."
              className="w-full rounded-lg border-2 text-sm outline-none border-(--color-divider) bg-(--color-bg) pt-2 pr-3 pb-2 pl-9"
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
                className={`pb-1 text-[13px] font-bold transition-colors border-b-2 ${
                  sort === value
                    ? "text-(--color-text) border-(--color-accent)"
                    : "text-(--color-neutral-600) border-transparent"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </form>
      </div>
      <div className="mt-7 mx-18 h-0.5 bg-(--color-divider)" />

      {featured && (
        <>
          <div
            className="relative grid items-center my-0 mx-18 py-9 px-0 grid-cols-[1fr_400px] gap-14"
          >
            <Link href={`/p/${featured.id}`} className="absolute inset-0 z-0" aria-label={featured.title} />

            <div>
              <span
                className="block text-[11px] font-bold uppercase tracking-[0.12em] text-(--color-accent) mb-2.5"
              >
                Featured today
              </span>
              <div
                className="flex items-center gap-2.5 text-[13px] text-(--color-neutral-600) mb-3.5"
              >
                <AuthorAvatar username={featured.ownerUsername} avatar={featured.ownerAvatar} />
                <Link href={`/u/${encodeURIComponent(featured.ownerUsername)}`} className="relative z-10 font-semibold hover:text-(--color-accent) text-(--color-text)">
                  {featured.ownerUsername}
                </Link>

              </div>
              <h2
                className="text-[32px] font-extrabold tracking-[-0.02em] leading-[1.12] mb-2.5"
              >
                {featured.title}
              </h2>

              {featured.description && (
                <p
                  className="text-[15px] leading-[1.6] text-(--color-neutral-500) max-w-[62ch] mb-4"
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
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-(--color-neutral-200) text-(--color-neutral-800)"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}


              </div>


              <div className='flex items-center' >
                <div className="mt-2 flex items-center ">
                  <VoteButton
                    projectId={featured.id}
                    initialVoted={featured.votedByRequester}
                    initialCount={featured.voteCount}
                    isLoggedIn={loggedIn}
                  />

                  <span className="inline-flex items-center gap-1 text-xs font-medium">
                    <Eye className="h-5 w-5 ml-1" />
                    {featured.viewCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center ml-auto">
                  <BookmarkButton
                    projectId={featured.id}
                    initialBookmarked={featured.bookmarkedByRequester}
                    isLoggedIn={loggedIn}
                  />
                  <PostOptionsMenu
                    className="ml-auto "
                    projectId={featured.id}
                    ownerUsername={featured.ownerUsername}
                    isLoggedIn={loggedIn}
                    isOwnPost={featured.ownerUsername === username}
                  />
                </div>



              </div>


            </div>
            <div
              className="grid place-items-center overflow-hidden rounded-lg h-[250px] border-2 border-(--color-divider) bg-(--color-neutral-200)"
            >
              {featured.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.thumbnail}
                  alt=""
                  className="h-full w-full rounded-lg object-cover object-top"
                />
              ) : (
                <span className="text-[84px] font-extrabold text-(--color-accent) leading-[1]">
                  {initial(featured.title)}
                </span>
              )}
            </div>
          </div>
          <div className="my-0 mx-18 h-0.5 bg-(--color-divider)" />
        </>
      )}

      <div className="flex gap-14 pt-9 px-18 pb-14">
        <div className="min-w-0 flex-1">
          <div
            className="text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600) mb-2"
          >
            Recently published
          </div>
          {projects.length === 0 && (
            <p className="text-sm text-(--color-neutral-600)">
              {q ? `Nothing found for "${q}".` : "Nothing published yet."}
            </p>
          )}
          <div className="flex flex-col">
            {projects.map((project) => (
              <div
                key={project.id}
                className="relative flex justify-between rounded-lg transition-colors hover:bg-muted gap-5 -mx-4 py-[22px] px-4 border-b-2 border-(--color-divider)"
              >
                <Link href={`/p/${project.id}`} className="absolute inset-0 z-0" aria-label={project.title} />


                <div className="min-w-0 w-full">
                  <div
                    className="flex items-center gap-2.5 text-[13px] text-(--color-neutral-600) mb-3.5"
                  >
                    <AuthorAvatar username={project.ownerUsername} avatar={project.ownerAvatar} />
                    <Link href={`/u/${encodeURIComponent(project.ownerUsername)}`} className="relative z-10 font-semibold hover:text-(--color-accent) text-(--color-text)">
                      {project.ownerUsername}
                    </Link>

                  </div>
                  <div className="mb-1 text-[20px] font-bold leading-[1.2]">
                    {project.title}
                  </div>
                  {project.description && (
                    <p className="mb-5 mt-4 text-sm leading-[1.6] text-(--color-neutral-500) max-w-[70ch] line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {project.tags.length > 0 && (
                    <div className="flex gap-1.5">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-(--color-neutral-200) text-(--color-neutral-800)"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <div className="flex">
                      <VoteButton
                        projectId={project.id}
                        initialVoted={project.votedByRequester}
                        initialCount={project.voteCount}
                        isLoggedIn={loggedIn}
                      />
                      <span className="inline-flex items-center gap-1 text-xs font-medium">
                        <Eye className="h-5 w-5 ml-1" />
                        {project.viewCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex">

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
                <div className="flex shrink-0 items-end gap-4 self-end">
                  <div
                    className="grid place-items-center overflow-hidden rounded-md w-[156px] h-[128px] border-2 border-(--color-divider) bg-(--color-neutral-200)"
                  >
                    {project.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.thumbnail}
                        alt=""
                        className="h-full w-full rounded-md object-cover object-top"
                      />
                    ) : (
                      <span className="text-2xl font-extrabold text-(--color-accent)">
                        {initial(project.title)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

          </div>

        </div>

        {(hotTopics.length > 0 || activeAuthors.length > 0) && (
          <aside className="hidden flex-shrink-0 flex-col gap-7 lg:flex w-[272px]">
            {hotTopics.length > 0 && (
              <div className="p-4">
                <h3
                  className="text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600)"
                >
                  Hot topics
                </h3>
                <div className="mt-3 flex flex-col">
                  {hotTopics.map(({ tag, count }) => (
                    <Link
                      key={tag}
                      href={`/explore?q=${encodeURIComponent(tag)}`}
                      className="flex items-center justify-between px-2 py-2 text-sm transition-colors hover:bg-muted border-b-2 border-(--color-divider)"
                    >
                      <span>{tag}</span>
                      <span className="text-xs text-(--color-neutral-600)">
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
                  className="text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600)"
                >
                  Active authors
                </h3>
                <div className="mt-3 flex flex-col">
                  {activeAuthors.map(({ username, avatar, count }) => (
                    <Link
                      key={username}
                      href={`/u/${encodeURIComponent(username)}`}
                      className="flex items-center gap-2.5 px-2 py-2 text-sm transition-colors hover:bg-muted border-b-2 border-(--color-divider)"
                    >
                      <AuthorAvatar username={username} avatar={avatar} size={26} />
                      <span className="min-w-0 flex-1 truncate">{username}</span>
                      <span className="text-xs text-(--color-neutral-600)">
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
