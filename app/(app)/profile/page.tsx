import Link from "next/link"
import { ArrowUpRight, Calendar, Users } from "lucide-react"
import { BadgesPanel } from "@/components/badges-panel"
import { AvatarUpload } from "@/components/avatar-upload"
import { BioEditor } from "@/components/bio-editor"
import { PublishedPanel } from "@/components/profile/published-panel"
import { BookmarksPanel } from "@/components/profile/bookmarks-panel"
import { UpvotedPanel } from "@/components/profile/upvoted-panel"
import { ForksPanel } from "@/components/profile/forks-panel"
import { ActivityPanel } from "@/components/profile/activity-panel"
import { getUsername, isLoggedIn } from "@/lib/auth"
import {
  getMyProfile,
  getMyProfileStats,
  getMyPublishedPage,
  getMyBookmarksPage,
  getMyUpvotedPage,
  getMyForksPage,
  getMyActivityPage,
} from "@/lib/profile"
import { PAGE_SIZE } from "@/lib/config"

type Tab = "activity" | "published" | "bookmarks" | "forks" | "upvoted"

const TAB_KEYS: Tab[] = ["activity", "published", "bookmarks", "forks", "upvoted"]
const TAB_LABELS: Record<Tab, string> = {
  activity: "Activity",
  published: "Published",
  bookmarks: "Bookmarks",
  forks: "Forks",
  upvoted: "Upvoted",
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const tab: Tab = TAB_KEYS.includes(tabParam as Tab) ? (tabParam as Tab) : "activity"

  const [fetchedProfile, statsBundle, loggedIn, cookieUsername] = await Promise.all([
    getMyProfile(),
    getMyProfileStats(),
    isLoggedIn(),
    getUsername(),
  ])
  const { stats, badges } = statsBundle

  const profile = fetchedProfile ?? { username: cookieUsername ?? "", bio: null, imageUrl: null, createdAt: null }

  return (
    <main className="mx-auto w-full flex-1 max-w-[1216px]">
        <div className="pt-9 px-18 pb-0">
          <div className="flex items-start gap-7 rounded-[28px] bg-card p-8">
            <AvatarUpload username={profile.username} imageUrl={profile.imageUrl} />
            <div className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-primary mb-1.5">
                My profile
              </span>
              <h1 className="font-display text-[36px] font-normal leading-[1.1] mb-2.5">
                {profile.username}
              </h1>
              <div className="flex items-center gap-4 text-[13px] mb-3.5 text-muted-foreground">
                {profile.createdAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-[14px] w-[14px]" />
                    Joined{" "}
                    {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                )}
                <Link href={`/u/${encodeURIComponent(profile.username)}/followers?tab=followers`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Users className="h-[14px] w-[14px]" />
                  {(stats?.followersCount ?? 0).toLocaleString('en-US')} followers
                </Link>
                <Link href={`/u/${encodeURIComponent(profile.username)}/followers?tab=following`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Users className="h-[14px] w-[14px]" />
                  {(stats?.followingCount ?? 0).toLocaleString('en-US')} following
                </Link>
              </div>
              <div className="mb-3.5">
                <BioEditor initialBio={profile.bio} />
              </div>
              <BadgesPanel badges={badges} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 pt-3 text-center">
            <Link href="/projects" className="group rounded-2xl bg-card py-[18px] transition-colors hover:bg-muted">
              <div className="font-display text-[28px] font-medium text-primary">{stats?.pathsPublished ?? 0}</div>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground mt-0.5">
                Projects published
                <ArrowUpRight className="h-[11px] w-[11px]" />
              </div>
            </Link>
            <div className="rounded-2xl bg-card py-[18px]">
              <div className="font-display text-[28px] font-medium text-primary">{stats?.upvotesReceived ?? 0}</div>
              <div className="text-xs font-medium text-muted-foreground mt-0.5">
                Upvotes received
              </div>
            </div>
            <div className="rounded-2xl bg-card py-[18px]">
              <div className="font-display text-[28px] font-medium text-primary">{(stats?.totalViews ?? 0).toLocaleString('en-US')}</div>
              <div className="text-xs font-medium text-muted-foreground mt-0.5">
                Total views
              </div>
            </div>
            <div className="rounded-2xl bg-card py-[18px]">
              <div className="font-display text-[28px] font-medium text-primary">{stats?.forksCount ?? 0}</div>
              <div className="text-xs font-medium text-muted-foreground mt-0.5">
                Forks
              </div>
            </div>
          </div>

          <div className="flex gap-1 border-b border-border mt-8">
            {TAB_KEYS.map((key) => (
              <Link
                key={key}
                href={`/profile?tab=${key}`}
                className={`relative inline-flex items-baseline gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === key ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {TAB_LABELS[key]}
                {tab === key && (
                  <span className="absolute inset-x-4 -bottom-px h-[3px] rounded-t-[3px] bg-primary" />
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="pt-4 px-18 pb-14">
          {tab === "activity" && (await ActivityTab())}
          {tab === "published" && (await PublishedTab())}
          {tab === "bookmarks" && (await BookmarksTab(loggedIn))}
          {tab === "forks" && (await ForksTab())}
          {tab === "upvoted" && (await UpvotedTab(loggedIn))}
        </div>
    </main>
  )
}

async function ActivityTab() {
  const { items, hasMore } = await getMyActivityPage(0, PAGE_SIZE)
  return <ActivityPanel initialItems={items} initialHasMore={hasMore} />
}

async function PublishedTab() {
  const { items, hasMore } = await getMyPublishedPage(0, PAGE_SIZE)
  return (
    <PublishedPanel
      initialItems={items}
      initialHasMore={hasMore}
      emptyMessage={
        <>
          Nothing published yet — publish a project from{" "}
          <Link href="/projects" className="font-medium text-primary">
            Projects.
          </Link>
        </>
      }
    />
  )
}

async function BookmarksTab(loggedIn: boolean) {
  const { items, hasMore } = await getMyBookmarksPage(0, PAGE_SIZE)
  return <BookmarksPanel initialItems={items} initialHasMore={hasMore} loggedIn={loggedIn} />
}

async function ForksTab() {
  const { items, hasMore } = await getMyForksPage(0, PAGE_SIZE)
  return <ForksPanel initialItems={items} initialHasMore={hasMore} />
}

async function UpvotedTab(loggedIn: boolean) {
  const { items, hasMore } = await getMyUpvotedPage(0, PAGE_SIZE)
  return <UpvotedPanel initialItems={items} initialHasMore={hasMore} loggedIn={loggedIn} />
}
