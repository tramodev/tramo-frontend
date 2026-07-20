import Link from "next/link"
import { Calendar, User, CreditCard, Shield } from "lucide-react"
import { SettingsView } from "@/components/settings-view"
import { PlanPanel } from "@/components/plan-panel"
import { PrivacySettings } from "@/components/privacy-settings"
import { getMyProfile } from "@/lib/profile"
import { getSubscriptionStatus } from "@/lib/subscription"
import { getUsername } from "@/lib/auth"

type Tab = "account" | "plan" | "privacy"

const TAB_KEYS: Tab[] = ["account", "plan", "privacy"]
const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "account", label: "Account", icon: User },
  { key: "plan", label: "Plan", icon: CreditCard },
  { key: "privacy", label: "Privacy", icon: Shield },
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
      <div className="pt-9 px-18 pb-16">
        <h1 className="font-display text-[36px] font-normal leading-[1.1] mb-8">Settings</h1>

        <div className="grid grid-cols-[216px_minmax(0,1fr)] gap-14 items-start">
          <nav className="sticky top-6 flex flex-col gap-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <Link
                key={key}
                href={`/settings?tab=${key}`}
                className={`flex items-center gap-3 h-10 rounded-full px-4 text-sm font-medium transition-colors ${
                  tab === key
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="max-w-[560px] flex flex-col gap-11">
            {tab === "account" && (
              <>
                <section>
                  <h2 className="mb-1 text-lg font-medium">Account information</h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Your username and email are used to sign in and can&apos;t be changed here.
                  </p>
                  <dl className="flex flex-col">
                    <div className="flex items-center justify-between py-3 text-sm border-t border-border">
                      <dt className="text-muted-foreground">Username</dt>
                      <dd className="font-medium">{profile.username}</dd>
                    </div>
                    <div className="flex items-center justify-between py-3 text-sm border-t border-border">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="font-medium">{profile.email || "—"}</dd>
                    </div>
                    {profile.createdAt && (
                      <div className="flex items-center justify-between py-3 text-sm border-t border-b border-border">
                        <dt className="text-muted-foreground">Joined</dt>
                        <dd className="inline-flex items-center gap-1.5 font-medium">
                          <Calendar className="h-[14px] w-[14px]" />
                          {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
                <SettingsView />
              </>
            )}

            {tab === "plan" && <PlanPanel initialStatus={await getSubscriptionStatus()} />}

            {tab === "privacy" && <PrivacySettings />}
          </div>
        </div>
      </div>
    </main>
  )
}
