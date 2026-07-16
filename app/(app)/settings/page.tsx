import Link from "next/link"
import { Calendar } from "lucide-react"
import { SettingsView } from "@/components/settings-view"
import { getMyProfile } from "@/lib/profile"
import { getUsername } from "@/lib/auth"

type Tab = "account" | "notifications" | "privacy"

const TAB_KEYS: Tab[] = ["account", "notifications", "privacy"]
const TABS: { key: Tab; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "notifications", label: "Notifications" },
  { key: "privacy", label: "Privacy" },
]

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const tab: Tab = TAB_KEYS.includes(tabParam as Tab) ? (tabParam as Tab) : "account"

  const [fetchedProfile, cookieUsername] = await Promise.all([getMyProfile(), getUsername()])
  const profile = fetchedProfile ?? { username: cookieUsername ?? "", email: "", bio: null, imageUrl: null, createdAt: null }

  return (
    <main className="mx-auto w-full flex-1 max-w-[1216px]">
      <div className="pt-9 px-18 pb-14">
        <span className="block text-[13px] font-medium text-primary mb-1.5">Settings</span>
        <h1 className="font-display text-[36px] font-normal leading-[1.1] mb-6">Account</h1>

        <div className="flex gap-1 border-b border-border mb-8">
          {TABS.map(({ key, label }) => (
            <Link
              key={key}
              href={`/settings?tab=${key}`}
              className={`relative inline-flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                tab === key ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {tab === key && (
                <span className="absolute inset-x-4 -bottom-px h-[3px] rounded-t-[3px] bg-primary" />
              )}
            </Link>
          ))}
        </div>

        {tab === "account" && (
          <div className="flex flex-col gap-10 max-w-[480px]">
            <section>
              <h2 className="mb-4 text-lg font-medium">Account information</h2>
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Username</dt>
                  <dd className="font-medium">{profile.username}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium">{profile.email || "—"}</dd>
                </div>
                {profile.createdAt && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Joined</dt>
                    <dd className="inline-flex items-center gap-1.5 font-medium">
                      <Calendar className="h-[14px] w-[14px]" />
                      {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
            <SettingsView />
          </div>
        )}

        {tab === "notifications" && (
          <p className="max-w-[480px] text-sm text-muted-foreground">
            Notification preferences are coming soon.
          </p>
        )}

        {tab === "privacy" && (
          <p className="max-w-[480px] text-sm text-muted-foreground">
            Privacy settings are coming soon.
          </p>
        )}
      </div>
    </main>
  )
}
