import Link from "next/link"
import { ArrowBigUp, ArrowUpRight, Bookmark, Calendar, Eye, GitFork, Rocket, Users } from "lucide-react"
import { VoteButton } from "@/components/vote-button"
import { BookmarkButton } from "@/components/bookmark-button"
import { ForkButton } from "@/components/fork-button"
import { BadgesPanel } from "@/components/badges-panel"
import { AvatarUpload } from "@/components/avatar-upload"
import { BioEditor } from "@/components/bio-editor"
import { PublishedGrid } from "@/components/published-grid"
import { getUsername, isLoggedIn } from "@/lib/auth"
import {
  getMyProfile,
  getMyProfileBundle,
  type ForkFeedItem,
  type ActivityItem,
} from "@/lib/profile"
import type { ProjectFeedItem } from "@/lib/public-project"

function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

type Tab = "activity" | "published" | "bookmarks" | "forks" | "upvoted"

const TAB_KEYS: Tab[] = ["activity", "published", "bookmarks", "forks", "upvoted"]

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const tab: Tab = TAB_KEYS.includes(tabParam as Tab) ? (tabParam as Tab) : "activity"

  const [fetchedProfile, bundle, loggedIn, cookieUsername] = await Promise.all([
    getMyProfile(),
    getMyProfileBundle(),
    isLoggedIn(),
    getUsername(),
  ])
  const { stats, bookmarks, upvoted, forks, badges, published, activity } = bundle

  const profile = fetchedProfile ?? { username: cookieUsername ?? "", bio: null, imageUrl: null, createdAt: null }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "activity", label: "Activity", count: activity.length },
    { key: "published", label: "Published", count: published.length },
    { key: "bookmarks", label: "Bookmarks", count: bookmarks.length },
    { key: "forks", label: "Forks", count: forks.length },
    { key: "upvoted", label: "Upvoted", count: upvoted.length },
  ]

  return (
    <main className="mx-auto w-full flex-1 max-w-[1216px]">
        <div className="pt-11 px-18 pb-0">
          <div className="flex items-start gap-7">
            <AvatarUpload username={profile.username} imageUrl={profile.imageUrl} />
            <div className="min-w-0 flex-1">
              <span
                className="block text-[11px] font-bold uppercase tracking-[0.12em] text-(--color-accent) mb-1.5"
              >
                My profile
              </span>
              <h1
                className="text-[40px] font-extrabold tracking-[-0.025em] leading-[1.05] mb-2"
              >
                {profile.username}
              </h1>
              <div className="flex items-center gap-4 text-xs mb-3 text-(--color-neutral-600)">
                {profile.createdAt && (
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Calendar className="h-[13px] w-[13px]" />
                    Joined{" "}
                    {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Users className="h-[13px] w-[13px]" />
                  {(stats?.followersCount ?? 0).toLocaleString()} followers
                </span>
              </div>
              <div className="mb-3">
                <BioEditor initialBio={profile.bio} />
              </div>
              <BadgesPanel badges={badges} />
            </div>
          </div>

          <div
            className="grid rounded-lg mt-7 grid-cols-4 border-2 border-(--color-divider)"
          >
            <Link
              href="/projects"
              className="transition-colors hover:bg-muted py-4 px-5 border-r-2 border-(--color-divider)"
            >
              <div className="text-[26px] font-extrabold">{stats?.pathsPublished ?? 0}</div>
              <div
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600)"
              >
                Projects published
                <ArrowUpRight className="h-[11px] w-[11px]" />
              </div>
            </Link>
            <div className="py-4 px-5 border-r-2 border-(--color-divider)">
              <div className="text-[26px] font-extrabold">{stats?.upvotesReceived ?? 0}</div>
              <div
                className="text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600)"
              >
                Upvotes received
              </div>
            </div>
            <div className="py-4 px-5 border-r-2 border-(--color-divider)">
              <div className="text-[26px] font-extrabold">{(stats?.totalViews ?? 0).toLocaleString()}</div>
              <div
                className="text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600)"
              >
                Total views
              </div>
            </div>
            <div className="py-4 px-5">
              <div className="text-[26px] font-extrabold">{stats?.forksCount ?? 0}</div>
              <div
                className="text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600)"
              >
                Forks
              </div>
            </div>
          </div>

          <div className="flex gap-6 border-b-2 border-(--color-divider) mt-8">
            {tabs.map(({ key, label, count }) => (
              <Link
                key={key}
                href={`/profile?tab=${key}`}
                className={`inline-flex items-baseline gap-1.5 pb-2 text-sm font-bold transition-colors -mb-0.5 border-b-2 ${
                  tab === key
                    ? "text-(--color-text) border-(--color-accent)"
                    : "text-(--color-neutral-600) border-transparent"
                }`}
              >
                {label}
                <span className="text-xs text-(--color-neutral-600)">
                  {count}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="pt-2 px-18 pb-14">
          {tab === "activity" && <ActivityPanel items={activity} />}
          {tab === "published" && (
            <PublishedGrid
              items={published}
              hrefFor={(id) => `/editor/${id}`}
              emptyMessage={
                <>
                  Nothing published yet — publish a project from{" "}
                  <Link href="/projects" className="font-semibold hover:text-[var(--color-accent)] text-(--color-neutral-700)">
                    Projects.
                  </Link>
                </>
              }
            />
          )}
          {tab === "bookmarks" && <BookmarksPanel items={bookmarks} loggedIn={loggedIn} />}
          {tab === "forks" && <ForksPanel items={forks} />}
          {tab === "upvoted" && <UpvotedPanel items={upvoted} loggedIn={loggedIn} />}
        </div>
    </main>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex items-center gap-5 rounded-lg transition-colors hover:bg-muted -mx-4 py-[22px] px-4 border-b-2 border-(--color-divider)"
    >
      {children}
    </div>
  )
}

function Thumbnail({ thumbnail, title }: { thumbnail: string | null; title: string }) {
  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-md w-24 h-16 border-2 border-(--color-divider) bg-(--color-neutral-200)"
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt="" className="h-full w-full object-cover object-top" />
      ) : (
        <span className="text-2xl font-extrabold text-(--color-accent)">
          {initial(title)}
        </span>
      )}
    </div>
  )
}

function EmptyState({ message, linkHref, linkLabel }: { message: string; linkHref: string; linkLabel: string }) {
  return (
    <p className="text-sm text-(--color-neutral-600)">
      {message}{" "}
      <Link href={linkHref} className="font-semibold hover:text-[var(--color-accent)] text-(--color-neutral-700)">
        {linkLabel}
      </Link>
    </p>
  )
}


const ACTIVITY_ICONS: Record<ActivityItem["type"], React.ComponentType<{ className?: string }>> = {
  published: Rocket,
  forked: GitFork,
  voted: ArrowBigUp,
  bookmarked: Bookmark,
  received_vote: ArrowBigUp,
  received_fork: GitFork,
  received_bookmark: Bookmark,
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

function ActivityPanel({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <EmptyState message="No activity yet — publish, fork, or upvote paths on" linkHref="/explore" linkLabel="Explore." />
  }
  return (
    <div className="flex flex-col">
      {items.map((item, index) => {
        const Icon = ACTIVITY_ICONS[item.type]
        return (
          <Row key={`${item.type}-${item.projectId}-${index}`}>
            <Link href={activityHref(item)} className="absolute inset-0 z-0" aria-label={item.projectTitle} />
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-(--color-neutral-200) text-(--color-neutral-700)"
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 text-sm">{activityText(item)}</div>
            <div className="shrink-0 text-xs text-(--color-neutral-600)">
              {formatActivityDate(item.timestamp)}
            </div>
          </Row>
        )
      })}
    </div>
  )
}

function BookmarksPanel({ items, loggedIn }: { items: ProjectFeedItem[]; loggedIn: boolean }) {
  if (items.length === 0) {
    return <EmptyState message="Nothing saved yet — bookmark paths from" linkHref="/explore" linkLabel="Explore." />
  }
  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <Row key={item.id}>
          <Link href={`/p/${item.id}`} className="absolute inset-0 z-0" aria-label={item.title} />
          <Thumbnail thumbnail={item.thumbnail} title={item.title} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[20px] font-bold">{item.title}</div>
            <div className="flex items-center gap-2.5 text-xs text-(--color-neutral-600)">
              <a
                href={`/u/${encodeURIComponent(item.ownerUsername)}`}
                className="relative z-10 font-semibold hover:text-[var(--color-accent)] text-(--color-neutral-700)"
              >
                by {item.ownerUsername}
              </a>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-[13px] w-[13px]" />
                {item.viewCount.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <ArrowBigUp className="h-[13px] w-[13px]" />
                {item.voteCount.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ForkButton projectId={item.id} isLoggedIn={loggedIn} variant="filled" />
            <BookmarkButton projectId={item.id} initialBookmarked={item.bookmarkedByRequester} isLoggedIn={loggedIn} />
          </div>
        </Row>
      ))}
    </div>
  )
}

function ForksPanel({ items }: { items: ForkFeedItem[] }) {
  if (items.length === 0) {
    return <EmptyState message="No forks yet — fork a path from" linkHref="/explore" linkLabel="Explore." />
  }
  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <Row key={item.id}>
          <Link href={`/editor/${item.id}`} className="absolute inset-0 z-0" aria-label={item.title} />
          <Thumbnail thumbnail={item.thumbnail} title={item.title} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[20px] font-bold">{item.title}</div>
            <div className="flex items-center gap-2.5 text-xs text-(--color-neutral-600)">
              <GitFork className="h-[11px] w-[11px]" />
              {item.forkedFromOwnerUsername ? (
                <span>
                  forked from{" "}
                  <a
                    href={`/u/${encodeURIComponent(item.forkedFromOwnerUsername)}`}
                    className="relative z-10 font-semibold hover:text-[var(--color-accent)] text-(--color-neutral-700)"
                  >
                    {item.forkedFromOwnerUsername}
                  </a>
                </span>
              ) : (
                <span>source no longer available</span>
              )}
            </div>
          </div>
          <Link
            href={`/editor/${item.id}`}
            className="relative z-10 shrink-0 rounded-md text-[13px] font-bold transition-colors hover:bg-muted hover:text-[var(--color-text)] py-2 px-3.5 border-2 border-(--color-divider) text-(--color-neutral-600)"
          >
            Open
          </Link>
        </Row>
      ))}
    </div>
  )
}

function UpvotedPanel({ items, loggedIn }: { items: ProjectFeedItem[]; loggedIn: boolean }) {
  if (items.length === 0) {
    return <EmptyState message="Nothing upvoted yet — find paths worth voting for on" linkHref="/explore" linkLabel="Explore." />
  }
  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <Row key={item.id}>
          <Link href={`/p/${item.id}`} className="absolute inset-0 z-0" aria-label={item.title} />
          <Thumbnail thumbnail={item.thumbnail} title={item.title} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[20px] font-bold">{item.title}</div>
            <div className="text-xs text-(--color-neutral-600)">
              by{" "}
              <a
                href={`/u/${encodeURIComponent(item.ownerUsername)}`}
                className="relative z-10 font-semibold hover:text-[var(--color-accent)] text-(--color-neutral-700)"
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
  )
}
