import Link from "next/link"

import { Wordmark } from "@/components/logo"
import { PrimaryNav } from "@/components/primary-nav"
import { UserMenu } from "@/components/user-menu"
import { NotificationButton } from "@/components/notification-button"

export function AppHeader({
  homeHref,
  loggedIn,
  isAdmin,
}: {
  homeHref: string
  loggedIn: boolean
  isAdmin: boolean
}) {
  return (
    <header className="flex items-center gap-6 py-[18px] px-10">
      <Link href={homeHref} className="mr-auto">
        <Wordmark />
      </Link>
      <div className="flex items-center gap-4">
        <PrimaryNav loggedIn={loggedIn} isAdmin={isAdmin} />
        <NotificationButton />
        <UserMenu />
      </div>
    </header>
  )
}
