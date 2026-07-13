import Link from "next/link"
import { ArrowBigUp, ArrowUpRight, Eye, GitFork, Pencil } from "lucide-react"
import { archivo } from "@/lib/fonts"
import "../modernist.css"
import { Wordmark } from "@/components/logo"
import { PrimaryNav } from "@/components/primary-nav"
import { UserMenu } from "@/components/user-menu"
import { NotificationButton } from "@/components/notification-button"
import { VoteButton } from "@/components/vote-button"
import { BookmarkButton } from "@/components/bookmark-button"
import { ForkButton } from "@/components/fork-button"
import { Footer } from "@/components/footer"
import { getHomeHref } from "@/lib/nav"
import { getUsername, isLoggedIn } from "@/lib/auth"
import {
  getMyProfile,
  getMyStats,
  getMyBookmarks,
  getMyUpvoted,
  getMyForks,
  type ForkFeedItem,
} from "@/lib/profile"
import type { ProjectFeedItem } from "@/lib/public-project"

function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

type Tab = "bookmarks" | "forks" | "upvoted"

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const tab: Tab = tabParam === "forks" ? "forks" : tabParam === "upvoted" ? "upvoted" : "bookmarks"

  const [fetchedProfile, stats, bookmarks, upvoted, forks, homeHref, loggedIn, cookieUsername] = await Promise.all([
    getMyProfile(),
    getMyStats(),
    getMyBookmarks(),
    getMyUpvoted(),
    getMyForks(),
    getHomeHref(),
    isLoggedIn(),
    getUsername(),
  ])

  // Falls back to the username cookie (always present here — middleware
  // gates /profile on it) so a stale/unreachable backend degrades to a
  // sparse page instead of blanking out entirely.
  const profile = fetchedProfile ?? { username: cookieUsername ?? "", bio: null, imageUrl: null }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "bookmarks", label: "Bookmarks", count: bookmarks.length },
    { key: "forks", label: "Forks", count: forks.length },
    { key: "upvoted", label: "Upvoted", count: upvoted.length },
  ]

  return (
    <div className={`modernist flex min-h-svh flex-col ${archivo.className}`} style={{ background: "var(--color-bg)" }}>
      <header
        className="flex items-center gap-6"
        style={{ borderBottom: "2px solid var(--color-divider)", padding: "18px 40px" }}
      >
        <Link href={homeHref} className="mr-auto">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-4">
          <PrimaryNav loggedIn={loggedIn} />
          <NotificationButton />
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto w-full flex-1" style={{ maxWidth: 1216 }}>
        {/* masthead */}
        <div style={{ padding: "44px 72px 0" }}>
          <div className="flex items-start gap-7">
            <span
              className="flex shrink-0 items-center justify-center text-[32px] font-extrabold"
              style={{ width: 88, height: 88, background: "var(--color-text)", color: "var(--color-bg)" }}
            >
              {initial(profile.username)}
            </span>
            <div className="min-w-0 flex-1">
              <span
                className="block text-[11px] font-bold uppercase"
                style={{ letterSpacing: "0.12em", color: "var(--color-accent)", marginBottom: "6px" }}
              >
                My profile
              </span>
              <h1
                className="text-[40px] font-extrabold"
                style={{ letterSpacing: "-0.025em", lineHeight: 1.05, marginBottom: "8px" }}
              >
                {profile.username}
              </h1>
              {profile.bio && (
                <p className="text-sm" style={{ lineHeight: 1.6, color: "var(--color-neutral-700)", maxWidth: "56ch" }}>
                  {profile.bio}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2" style={{ paddingTop: 6 }}>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-md text-[13px] font-bold transition-colors hover:bg-muted hover:text-[var(--color-text)]"
                style={{
                  padding: "8px 14px",
                  border: "2px solid var(--color-divider)",
                  color: "var(--color-neutral-600)",
                }}
              >
                <Pencil className="h-[15px] w-[15px]" />
                Edit profile
              </Link>
            </div>
          </div>

          {/* stats strip */}
          <div
            className="grid rounded-lg"
            style={{ marginTop: 28, gridTemplateColumns: "repeat(4, 1fr)", border: "2px solid var(--color-divider)" }}
          >
            <Link
              href="/projects"
              className="transition-colors hover:bg-muted"
              style={{ padding: "16px 20px", borderRight: "2px solid var(--color-divider)" }}
            >
              <div className="text-[26px] font-extrabold">{stats?.pathsPublished ?? 0}</div>
              <div
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase"
                style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
              >
                Paths published
                <ArrowUpRight className="h-[11px] w-[11px]" />
              </div>
            </Link>
            <div style={{ padding: "16px 20px", borderRight: "2px solid var(--color-divider)" }}>
              <div className="text-[26px] font-extrabold">{stats?.upvotesReceived ?? 0}</div>
              <div
                className="text-[11px] font-bold uppercase"
                style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
              >
                Upvotes received
              </div>
            </div>
            <div style={{ padding: "16px 20px", borderRight: "2px solid var(--color-divider)" }}>
              <div className="text-[26px] font-extrabold">{(stats?.totalViews ?? 0).toLocaleString()}</div>
              <div
                className="text-[11px] font-bold uppercase"
                style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
              >
                Total views
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div className="text-[26px] font-extrabold">{stats?.forksCount ?? 0}</div>
              <div
                className="text-[11px] font-bold uppercase"
                style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
              >
                Forks
              </div>
            </div>
          </div>

          {/* tabs */}
          <div className="flex gap-6" style={{ borderBottom: "2px solid var(--color-divider)", marginTop: 32 }}>
            {tabs.map(({ key, label, count }) => (
              <Link
                key={key}
                href={`/profile?tab=${key}`}
                className="inline-flex items-baseline gap-1.5 pb-2 text-sm font-bold transition-colors"
                style={{
                  marginBottom: -2,
                  color: tab === key ? "var(--color-text)" : "var(--color-neutral-600)",
                  borderBottom: tab === key ? "2px solid var(--color-accent)" : "2px solid transparent",
                }}
              >
                {label}
                <span className="text-xs" style={{ color: "var(--color-neutral-600)" }}>
                  {count}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* active panel */}
        <div style={{ padding: "8px 72px 56px" }}>
          {tab === "bookmarks" && <BookmarksPanel items={bookmarks} loggedIn={loggedIn} />}
          {tab === "forks" && <ForksPanel items={forks} />}
          {tab === "upvoted" && <UpvotedPanel items={upvoted} loggedIn={loggedIn} />}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex items-center gap-5 rounded-lg transition-colors hover:bg-muted"
      style={{ margin: "0 -16px", padding: "22px 16px", borderBottom: "2px solid var(--color-divider)" }}
    >
      {children}
    </div>
  )
}

function Thumbnail({ thumbnail, title }: { thumbnail: string | null; title: string }) {
  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-md"
      style={{ width: 96, height: 64, border: "2px solid var(--color-divider)", background: "var(--color-neutral-200)" }}
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt="" className="h-full w-full object-cover object-top" />
      ) : (
        <span className="text-2xl font-extrabold" style={{ color: "var(--color-accent)" }}>
          {initial(title)}
        </span>
      )}
    </div>
  )
}

function EmptyState({ message, linkHref, linkLabel }: { message: string; linkHref: string; linkLabel: string }) {
  return (
    <p className="text-sm" style={{ color: "var(--color-neutral-600)" }}>
      {message}{" "}
      <Link href={linkHref} className="font-semibold hover:text-[var(--color-accent)]" style={{ color: "var(--color-neutral-700)" }}>
        {linkLabel}
      </Link>
    </p>
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
            <div className="flex items-center gap-2.5 text-xs" style={{ color: "var(--color-neutral-600)" }}>
              <a
                href={`/explore?q=${encodeURIComponent(item.ownerUsername)}`}
                className="relative z-10 font-semibold hover:text-[var(--color-accent)]"
                style={{ color: "var(--color-neutral-700)" }}
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
          <Link href={`/dashboard/${item.id}`} className="absolute inset-0 z-0" aria-label={item.title} />
          <Thumbnail thumbnail={item.thumbnail} title={item.title} />
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[20px] font-bold">{item.title}</div>
            <div className="flex items-center gap-2.5 text-xs" style={{ color: "var(--color-neutral-600)" }}>
              <GitFork className="h-[11px] w-[11px]" />
              {item.forkedFromOwnerUsername ? (
                <span>
                  forked from{" "}
                  <a
                    href={`/explore?q=${encodeURIComponent(item.forkedFromOwnerUsername)}`}
                    className="relative z-10 font-semibold hover:text-[var(--color-accent)]"
                    style={{ color: "var(--color-neutral-700)" }}
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
            href={`/dashboard/${item.id}`}
            className="relative z-10 shrink-0 rounded-md text-[13px] font-bold transition-colors hover:bg-muted hover:text-[var(--color-text)]"
            style={{ padding: "8px 14px", border: "2px solid var(--color-divider)", color: "var(--color-neutral-600)" }}
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
            <div className="text-xs" style={{ color: "var(--color-neutral-600)" }}>
              by{" "}
              <a
                href={`/explore?q=${encodeURIComponent(item.ownerUsername)}`}
                className="relative z-10 font-semibold hover:text-[var(--color-accent)]"
                style={{ color: "var(--color-neutral-700)" }}
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
