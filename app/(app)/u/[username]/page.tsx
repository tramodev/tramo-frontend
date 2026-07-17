import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowUpRight, Calendar, Users } from "lucide-react"
import { BadgesPanel } from "@/components/badges-panel"
import { PublishedPanel } from "@/components/profile/published-panel"
import { FollowButton } from "@/components/follow-button"
import { isLoggedIn } from "@/lib/auth"
import { getPublicProfile, getPublicUserPublishedPage } from "@/lib/public-profile"
import { PAGE_SIZE } from "@/lib/config"

function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const [profile, loggedIn] = await Promise.all([
    getPublicProfile(username),
    isLoggedIn(),
  ])

  if (!profile) {
    notFound()
  }
  if (profile.self) {
    redirect("/profile")
  }

  const { stats, badges } = profile
  const { items: published, hasMore: publishedHasMore } = await getPublicUserPublishedPage(username, 0, PAGE_SIZE)

  return (
    <main className="mx-auto w-full flex-1 max-w-[1216px]">
        <div className="pt-9 px-18 pb-14">
          <div className="flex items-start gap-7 rounded-[28px] bg-card p-8">
            <span
              className="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-[46px] font-medium w-[140px] h-[140px] bg-primary text-primary-foreground"
            >
              {profile.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial(profile.username)
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-4">
                <h1 className="font-display text-[36px] font-normal leading-[1.1]">
                  {profile.username}
                </h1>
                <FollowButton username={profile.username} initialFollowing={profile.following} isLoggedIn={loggedIn} />
              </div>
              <div className="flex items-center gap-4 text-[13px] mb-3.5 text-muted-foreground">
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
                <p className="mb-3.5 w-3/4 text-sm leading-[1.6] text-foreground">
                  {profile.bio}
                </p>
              )}
              <BadgesPanel badges={badges} />
            </div>
          </div>

          <div className="grid gap-3 mt-3 grid-cols-4 text-center">
            <div className="rounded-2xl bg-card py-[18px]">
              <div className="font-display text-[28px] font-medium text-primary">{stats.pathsPublished}</div>
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
        </div>
    </main>
  )
}
