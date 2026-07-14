import Link from "next/link"

import { Wordmark } from "@/components/logo"
import { PrimaryNav } from "@/components/primary-nav"
import { UserMenu } from "@/components/user-menu"
import { NotificationButton } from "@/components/notification-button"

export function AppHeader({
  active,
  homeHref,
  loggedIn,
  isAdmin,
}: {
  active?: "projects" | "explore" | "admin"
  homeHref: string
  loggedIn: boolean
  isAdmin: boolean
}) {
  return (
    <header
      className="flex items-center gap-6"
      style={{ borderBottom: "2px solid var(--color-divider)", padding: "18px 40px" }}
    >
      <Link href={homeHref} className="mr-auto">
        <Wordmark />
      </Link>
      <div className="flex items-center gap-4">
        <PrimaryNav active={active} loggedIn={loggedIn} isAdmin={isAdmin} />
        <NotificationButton />
        <UserMenu />
      </div>
    </header>
  )
}
