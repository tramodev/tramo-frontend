import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, Cake, Calendar, MapPin, Link as LinkIcon, Users } from "lucide-react"
import { BadgesPanel } from "@/components/profile/badges-panel"
import { EditProfileModal } from "@/components/profile/edit-profile-modal"
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
import { getPrivacySettings } from "@/lib/privacy"
import { PAGE_SIZE } from "@/lib/config"

export const metadata: Metadata = {
  title: "My Profile",
  robots: { index: false, follow: false },
}

function formatBirthDate(birthDate: string) {
  const [year, month, day] = birthDate.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

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

  const [fetchedProfile, statsBundle, loggedIn, cookieUsername, privacy] = await Promise.all([
    getMyProfile(),
    getMyProfileStats(),
    isLoggedIn(),
    getUsername(),
    getPrivacySettings(),
  ])
  const { stats, badges } = statsBundle

  const profile = fetchedProfile ?? { username: cookieUsername ?? "", bio: null, birthDate: null, location: null, website: null, imageUrl: null, bannerUrl: null, createdAt: null, selectedBadge: null }

  const bannerUrl = badges.some((badge) => badge.code === "supporter" && badge.earned) ? profile.bannerUrl : null

  return (
    <main className="mx-auto w-full flex-1 max-w-[1216px]">
        <div className="pt-9 px-18 pb-0">
          {bannerUrl && (
            <div className="mb-3">
              <div className="relative aspect-[6/1] w-full overflow-hidden rounded-[28px] bg-muted">
                <Image src={bannerUrl} alt="" fill sizes="1216px" className="object-cover" />
              </div>
            </div>
          )}
          <div className="relative rounded-[28px] bg-card p-8">
            <div className="absolute right-8 top-8">
              <EditProfileModal
                username={profile.username}
                initialImageUrl={profile.imageUrl}
                initialBannerUrl={profile.bannerUrl}
                initialBio={profile.bio}
                initialBirthDate={profile.birthDate}
                initialLocation={profile.location}
                initialWebsite={profile.website}
                initialShowAge={privacy.showAge}
                badges={badges}
                initialSelectedBadge={profile.selectedBadge}
              />
            </div>
            <div className="flex items-start gap-7">
              <div className="relative flex h-[104px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[38px] font-medium font-display text-primary-foreground">
                {profile.imageUrl ? (
                  <Image src={profile.imageUrl} alt="" fill sizes="104px" className="object-cover" />
                ) : (
                  initial(profile.username)
                )}
              </div>
              <div className="flex min-w-0 flex-col items-start pt-1">
                <h1 className="font-display text-[36px] font-normal leading-[1.1] mb-2">
                  {profile.username}
                </h1>

                {profile.bio && (
                  <p className="mb-2 max-w-2xl text-left text-sm text-foreground">{profile.bio}</p>
                )}

                <div className="flex flex-wrap items-center justify-start gap-4 text-[13px] mb-3.5 text-muted-foreground">
                  {profile.birthDate && (
                    <span className="inline-flex items-center gap-1.5">
                      <Cake className="h-[14px] w-[14px]" />
                      Born {formatBirthDate(profile.birthDate)}
                    </span>
                  )}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-[14px] w-[14px]" />
                      {profile.location}
                    </span>
                  )}
                  {profile.website && (
                    <a
                      href={/^https?:\/\//.test(profile.website) ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                    >
                      <LinkIcon className="h-[14px] w-[14px]" />
                      {profile.website}
                    </a>
                  )}
                  {profile.createdAt && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-[14px] w-[14px]" />
                      Joined{" "}
                      {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-start gap-4 text-[13px] mb-3.5 text-muted-foreground">
                  <Link href={`/u/${encodeURIComponent(profile.username)}/followers?tab=followers`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                    <Users className="h-[14px] w-[14px]" />
                    {(stats?.followersCount ?? 0).toLocaleString('en-US')} followers
                  </Link>
                  <Link href={`/u/${encodeURIComponent(profile.username)}/followers?tab=following`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                    <Users className="h-[14px] w-[14px]" />
                    {(stats?.followingCount ?? 0).toLocaleString('en-US')} following
                  </Link>
                </div>

                <BadgesPanel badges={badges} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 pt-3 text-center">
            <Link href="/projects" className="group rounded-2xl bg-card py-[18px] transition-colors hover:bg-muted">
              <div className="font-display text-[28px] font-medium text-primary">{stats?.trailsPublished ?? 0}</div>
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
