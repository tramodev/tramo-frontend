import { cache } from "react"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowUpRight, Calendar, MapPin, Link as LinkIcon, Users } from "lucide-react"
import { BadgesPanel } from "@/components/profile/badges-panel"
import { PublishedPanel } from "@/components/profile/published-panel"
import { FollowButton } from "@/components/social/follow-button"
import { BlockButton } from "@/components/social/block-button"
import { isLoggedIn } from "@/lib/auth"
import { getPublicProfile, getPublicUserPublishedPage, getPublicUserUpvotedPage } from "@/lib/public-profile"
import { PAGE_SIZE } from "@/lib/config"

function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

const fetchProfile = cache(getPublicProfile)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const profile = await fetchProfile(username)
  if (!profile) return { title: "User not found" }
  const description = profile.bio ?? `See ${profile.username}'s projects on Tramo.`
  const images = profile.imageUrl ? [profile.imageUrl] : undefined
  return {
    title: profile.username,
    description,
    alternates: { canonical: `/u/${encodeURIComponent(profile.username)}` },
    openGraph: images ? { images } : undefined,
    twitter: { card: "summary_large_image", title: profile.username, description, images },
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const [profile, loggedIn] = await Promise.all([
    fetchProfile(username),
    isLoggedIn(),
  ])

  if (!profile) {
    notFound()
  }
  if (profile.self) {
    redirect("/profile")
  }

  const { stats, badges } = profile
  const bannerUrl = badges.some((badge) => badge.code === "supporter" && badge.earned) ? profile.bannerUrl : null
  const [{ items: published, hasMore: publishedHasMore }, upvoted] = await Promise.all([
    getPublicUserPublishedPage(username, 0, PAGE_SIZE),
    profile.showUpvotes ? getPublicUserUpvotedPage(username, 0, PAGE_SIZE) : null,
  ])

  const avatar = (
    <span className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-[32px] sm:text-[46px] font-medium w-[100px] h-[100px] sm:w-[140px] sm:h-[140px] bg-primary text-primary-foreground ring-4 ring-background">
      {profile.imageUrl ? (
        <Image src={profile.imageUrl} alt="" fill sizes="140px" className="object-cover" />
      ) : (
        initial(profile.username)
      )}
    </span>
  )

  return (
    <main className="mx-auto w-full flex-1 max-w-[1216px]">
        <div className="pt-9 px-6 md:px-18 pb-14">
          {bannerUrl && (
            <div className="relative mb-3">
              <div className="relative aspect-[6/1] w-full overflow-hidden rounded-[28px] bg-muted">
                <Image src={bannerUrl} alt="" fill sizes="1216px" className="object-cover" />
              </div>
              <div className="absolute left-1/2 -bottom-[50px] z-10 -translate-x-1/2 sm:left-8 sm:-bottom-[70px] sm:translate-x-0">
                {avatar}
              </div>
            </div>
          )}
          <div className={`flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-7 rounded-[28px] bg-card p-5 sm:p-8 ${bannerUrl ? "pt-16 sm:pt-20" : ""}`}>
            {!bannerUrl && avatar}
            <div className={`min-w-0 flex-1 text-center sm:text-left ${bannerUrl ? "sm:pl-[200px]" : ""}`}>
              <div className="mb-2 flex flex-wrap items-center justify-center sm:justify-start gap-4">
                <h1 className="font-display text-[28px] sm:text-[36px] font-normal leading-[1.1]">
                  {profile.username}
                </h1>
                <FollowButton username={profile.username} initialFollowing={profile.following} isLoggedIn={loggedIn} />
                <BlockButton username={profile.username} initialBlocked={profile.blocked} isLoggedIn={loggedIn} />
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[13px] mb-3.5 text-muted-foreground">
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
                {profile.age != null && (
                  <span className="inline-flex items-center gap-1.5">{profile.age} years old</span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-[14px] w-[14px]" />
                  Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <Link href={`/u/${encodeURIComponent(profile.username)}/followers?tab=followers`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Users className="h-[14px] w-[14px]" />
                  {stats.followersCount.toLocaleString('en-US')} followers
                </Link>
                <Link href={`/u/${encodeURIComponent(profile.username)}/followers?tab=following`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Users className="h-[14px] w-[14px]" />
                  {stats.followingCount.toLocaleString('en-US')} following
                </Link>
              </div>
              {profile.bio && (
                <p className="mb-3.5 w-full sm:w-3/4 text-sm leading-[1.6] text-foreground">
                  {profile.bio}
                </p>
              )}
              <BadgesPanel badges={badges} />
            </div>
          </div>

          <div className="grid gap-3 mt-3 grid-cols-2 sm:grid-cols-4 text-center">
            <div className="rounded-2xl bg-card py-[18px]">
              <div className="font-display text-[28px] font-medium text-primary">{stats.trailsPublished}</div>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground mt-0.5">
                Projects published
                <ArrowUpRight className="h-[11px] w-[11px]" />
              </div>
            </div>
            <div className="rounded-2xl bg-card py-[18px]">
              <div className="font-display text-[28px] font-medium text-primary">{stats.upvotesReceived}</div>
              <div className="text-xs font-medium text-muted-foreground mt-0.5">
                Upvotes received
              </div>
            </div>
            <div className="rounded-2xl bg-card py-[18px]">
              <div className="font-display text-[28px] font-medium text-primary">{stats.totalViews.toLocaleString('en-US')}</div>
              <div className="text-xs font-medium text-muted-foreground mt-0.5">
                Total views
              </div>
            </div>
            <div className="rounded-2xl bg-card py-[18px]">
              <div className="font-display text-[28px] font-medium text-primary">{stats.forksCount}</div>
              <div className="text-xs font-medium text-muted-foreground mt-0.5">
                Forks
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 text-[13px] font-medium text-muted-foreground">
              Published projects
            </div>
            <PublishedPanel
              initialItems={published}
              initialHasMore={publishedHasMore}
              username={username}
              emptyMessage={`${profile.username} hasn't published anything yet.`}
            />
          </div>

          {upvoted && (
            <div className="mt-8">
              <div className="mb-3 text-[13px] font-medium text-muted-foreground">
                Upvoted
              </div>
              <PublishedPanel
                initialItems={upvoted.items}
                initialHasMore={upvoted.hasMore}
                username={username}
                kind="upvoted"
                emptyMessage={`${profile.username} hasn't upvoted anything yet.`}
              />
            </div>
          )}
        </div>
    </main>
  )
}
