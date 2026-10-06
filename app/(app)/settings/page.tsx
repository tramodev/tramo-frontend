// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import Link from "next/link"
import { Calendar, User, CreditCard, Shield, Bell } from "lucide-react"
import { SettingsView } from "@/components/profile/settings-view"
import { PlanPanel } from "@/components/profile/plan-panel"
import { PrivacySettings } from "@/components/profile/privacy-settings"
import { NotificationSettings } from "@/components/profile/notification-settings"
import { getNotificationPreferences } from "@/lib/notification-prefs"
import { getMyProfile } from "@/lib/profile"
import { getSubscriptionStatus } from "@/lib/subscription"
import { getUsername } from "@/lib/auth"
import { getPrivacySettings } from "@/lib/privacy"
import { getBlockedUsersPage } from "@/lib/blocked-users"
import { PAGE_SIZE } from "@/lib/config"

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
}

type Tab = "account" | "plan" | "notifications" | "privacy"

const TAB_KEYS: Tab[] = ["account", "plan", "notifications", "privacy"]
const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "account", label: "Account", icon: User },
  { key: "plan", label: "Plan", icon: CreditCard },
  { key: "notifications", label: "Notifications", icon: Bell },
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
  const profile = fetchedProfile ?? { username: cookieUsername ?? "", email: "", bio: null, birthDate: null, location: null, website: null, imageUrl: null, createdAt: null }

  const [privacy, blockedUsers] = tab === "privacy"
    ? await Promise.all([getPrivacySettings(), getBlockedUsersPage(0, PAGE_SIZE)])
    : [null, null]

  const notificationPrefs = tab === "notifications" ? await getNotificationPreferences() : null

  return (
    <main className="mx-auto w-full flex-1 max-w-[1216px]">
      <div className="pt-9 px-18 pb-16">
        <div className="grid grid-cols-[216px_minmax(0,1fr)] gap-14 items-start">
          <nav className="sticky top-6 flex flex-col gap-1">
            <h1 className="font-display text-[36px] font-normal leading-[1.1] mb-8">Settings</h1>
            {TABS.map(({ key, label, icon: Icon }) => (
              <Link
                key={key}
                href={`/settings?tab=${key}`}
                className={`flex items-center gap-3 h-10 rounded-full px-4 text-sm font-medium transition-colors ${tab === key
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
            {tab === "notifications" && notificationPrefs && (
              <NotificationSettings
                initialEnabled={notificationPrefs.notificationsEnabled}
                initialMutedTypes={notificationPrefs.mutedNotificationTypes}
              />
            )}
            {tab === "privacy" && privacy && blockedUsers && (
              <PrivacySettings
                initialVisibility={privacy.profileVisibility}
                initialShowUpvotes={privacy.showUpvotes}
                initialAllowForks={privacy.allowForks}
                initialCommentsPolicy={privacy.commentsPolicy}
                initialBlockedUsers={blockedUsers.items}
                initialBlockedUsersHasMore={blockedUsers.hasMore}
                pageSize={PAGE_SIZE}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
