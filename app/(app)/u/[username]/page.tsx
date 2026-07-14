import { notFound, redirect } from "next/navigation"
import { ArrowUpRight, Calendar, Users } from "lucide-react"
import { BadgesPanel } from "@/components/badges-panel"
import { PublishedGrid } from "@/components/published-grid"
import { FollowButton } from "@/components/follow-button"
import { isLoggedIn } from "@/lib/auth"
import { getPublicProfile } from "@/lib/public-profile"

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

  const { stats, badges, published } = profile

  return (
    <main className="mx-auto w-full flex-1 max-w-[1216px]">
        <div className="pt-11 px-18 pb-0">
          <div className="flex items-start gap-7">
            <span
              className="flex shrink-0 items-center justify-center overflow-hidden text-[46px] font-extrabold w-[140px] h-[140px] bg-(--color-text) text-(--color-bg)"
            >
              {profile.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial(profile.username)
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center gap-4">
                <h1
                  className="text-[40px] font-extrabold tracking-[-0.025em] leading-[1.05]"
                >
                  {profile.username}
                </h1>
                <FollowButton username={profile.username} initialFollowing={profile.following} isLoggedIn={loggedIn} />
              </div>
              <div className="flex items-center gap-4 text-xs mb-3 text-(--color-neutral-600)">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Calendar className="h-[13px] w-[13px]" />
                  Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Users className="h-[13px] w-[13px]" />
                  {stats.followersCount.toLocaleString()} followers
                </span>
              </div>
              {profile.bio && (
                <p className="mb-3 w-3/4 text-sm leading-[1.6] text-(--color-neutral-800)">
                  {profile.bio}
                </p>
              )}
              <BadgesPanel badges={badges} />
            </div>
          </div>

          <div
            className="grid rounded-lg mt-7 grid-cols-4 border-2 border-(--color-divider)"
          >
            <div className="py-4 px-5 border-r-2 border-(--color-divider)">
              <div className="text-[26px] font-extrabold">{stats.pathsPublished}</div>
              <div
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600)"
              >
                Projects published
                <ArrowUpRight className="h-[11px] w-[11px]" />
              </div>
            </div>
            <div className="py-4 px-5 border-r-2 border-(--color-divider)">
              <div className="text-[26px] font-extrabold">{stats.upvotesReceived}</div>
              <div
                className="text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600)"
              >
                Upvotes received
              </div>
            </div>
            <div className="py-4 px-5 border-r-2 border-(--color-divider)">
              <div className="text-[26px] font-extrabold">{stats.totalViews.toLocaleString()}</div>
              <div
                className="text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600)"
              >
                Total views
              </div>
            </div>
            <div className="py-4 px-5">
              <div className="text-[26px] font-extrabold">{stats.forksCount}</div>
              <div
                className="text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600)"
              >
                Forks
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-(--color-neutral-600)">
              Published projects
            </div>
            <PublishedGrid
              items={published}
              hrefFor={(id) => `/p/${id}`}
              emptyMessage={`${profile.username} hasn't published anything yet.`}
            />
          </div>
        </div>
    </main>
  )
}
