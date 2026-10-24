// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { AppHeader } from "@/components/layout/app-header"
import { isLoggedIn } from "@/lib/auth"
import { getMyProfile } from "@/lib/profile"
import { getHomeHref } from "@/lib/nav"
import { CurrentUserProvider } from "@/components/auth/current-user"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [loggedIn, homeHref] = await Promise.all([isLoggedIn(), getHomeHref()])
  const profile = loggedIn ? await getMyProfile() : null
  const admin = profile?.role === "ADMIN"

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader
        homeHref={admin ? "/explore" : homeHref}
        loggedIn={loggedIn}
        userId={profile?.userId ?? null}
        isAdmin={admin}
        username={profile?.username ?? null}
        imageUrl={profile?.imageUrl ?? null}
      />
      <CurrentUserProvider userId={profile?.userId ?? null}>{children}</CurrentUserProvider>
    </div>
  )
}
