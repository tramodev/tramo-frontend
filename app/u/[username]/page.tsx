import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowUpRight, Calendar, Users } from "lucide-react"
import { archivo } from "@/lib/fonts"
import "../../modernist.css"
import { Wordmark } from "@/components/logo"
import { PrimaryNav } from "@/components/primary-nav"
import { UserMenu } from "@/components/user-menu"
import { NotificationButton } from "@/components/notification-button"
import { BadgesPanel } from "@/components/badges-panel"
import { PublishedGrid } from "@/components/published-grid"
import { FollowButton } from "@/components/follow-button"
import { Footer } from "@/components/footer"
import { getHomeHref } from "@/lib/nav"
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
  const [profile, homeHref, loggedIn] = await Promise.all([
    getPublicProfile(username),
    getHomeHref(),
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
              className="flex shrink-0 items-center justify-center overflow-hidden text-[46px] font-extrabold"
              style={{ width: 140, height: 140, background: "var(--color-text)", color: "var(--color-bg)" }}
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
                  className="text-[40px] font-extrabold"
                  style={{ letterSpacing: "-0.025em", lineHeight: 1.05 }}
                >
                  {profile.username}
                </h1>
                <FollowButton username={profile.username} initialFollowing={profile.following} isLoggedIn={loggedIn} />
              </div>
              <div className="flex items-center gap-4 text-xs" style={{ marginBottom: 12, color: "var(--color-neutral-600)" }}>
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
                <p className="mb-3 w-3/4 text-sm" style={{ lineHeight: 1.6, color: "var(--color-neutral-800)" }}>
                  {profile.bio}
                </p>
              )}
              <BadgesPanel badges={badges} />
            </div>
          </div>

          {/* stats strip */}
          <div
            className="grid rounded-lg"
            style={{ marginTop: 28, gridTemplateColumns: "repeat(4, 1fr)", border: "2px solid var(--color-divider)" }}
          >
            <div style={{ padding: "16px 20px", borderRight: "2px solid var(--color-divider)" }}>
              <div className="text-[26px] font-extrabold">{stats.pathsPublished}</div>
              <div
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase"
                style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
              >
                Paths published
                <ArrowUpRight className="h-[11px] w-[11px]" />
              </div>
            </div>
            <div style={{ padding: "16px 20px", borderRight: "2px solid var(--color-divider)" }}>
              <div className="text-[26px] font-extrabold">{stats.upvotesReceived}</div>
              <div
                className="text-[11px] font-bold uppercase"
                style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
              >
                Upvotes received
              </div>
            </div>
            <div style={{ padding: "16px 20px", borderRight: "2px solid var(--color-divider)" }}>
              <div className="text-[26px] font-extrabold">{stats.totalViews.toLocaleString()}</div>
              <div
                className="text-[11px] font-bold uppercase"
                style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
              >
                Total views
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div className="text-[26px] font-extrabold">{stats.forksCount}</div>
              <div
                className="text-[11px] font-bold uppercase"
                style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}
              >
                Forks
              </div>
            </div>
          </div>

          {/* published paths */}
          <div style={{ marginTop: 32 }}>
            <div className="mb-3 text-[11px] font-bold uppercase" style={{ letterSpacing: "0.08em", color: "var(--color-neutral-600)" }}>
              Published paths
            </div>
            <PublishedGrid
              items={published}
              hrefFor={(id) => `/p/${id}`}
              emptyMessage={`${profile.username} hasn't published anything yet.`}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
