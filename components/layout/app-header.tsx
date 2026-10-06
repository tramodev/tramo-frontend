// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import Link from "next/link"

import { Wordmark } from "@/components/layout/logo"
import { PrimaryNav } from "@/components/layout/primary-nav"
import { getNavItems } from "@/lib/nav-items"
import { UserMenu } from "@/components/layout/user-menu"
import { NotificationButton } from "@/components/layout/notification-button"
import { Button } from "@/components/ui/button"

export function AppHeader({
  homeHref,
  loggedIn,
  isAdmin,
  username,
  imageUrl,
}: {
  homeHref: string
  loggedIn: boolean
  isAdmin: boolean
  username: string | null
  imageUrl: string | null
}) {
  return (
    <header className="flex items-center gap-6 py-[18px] px-4 md:px-10">
      <Link href={homeHref} className="mr-auto">
        <Wordmark />
      </Link>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex">
          <PrimaryNav loggedIn={loggedIn} isAdmin={isAdmin} />
        </div>
        <NotificationButton loggedIn={loggedIn} />
        <UserMenu loggedIn={loggedIn} username={username} imageUrl={imageUrl} navItems={getNavItems(loggedIn, isAdmin)} />
        {!loggedIn && (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-medium text-primary px-4 py-2.5 rounded-full transition-colors hover:bg-muted"
            >
              Sign in
            </Link>
            <Button asChild size="lg">
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
