// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { AppHeader } from "@/components/layout/app-header"
import { isLoggedIn } from "@/lib/auth"
import { getMyProfile } from "@/lib/profile"
import { getHomeHref } from "@/lib/nav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [loggedIn, homeHref] = await Promise.all([isLoggedIn(), getHomeHref()])
  const profile = loggedIn ? await getMyProfile() : null
  const admin = profile?.role === "ADMIN"

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader
        homeHref={admin ? "/explore" : homeHref}
        loggedIn={loggedIn}
        isAdmin={admin}
        username={profile?.username ?? null}
        imageUrl={profile?.imageUrl ?? null}
      />
      {children}
    </div>
  )
}
