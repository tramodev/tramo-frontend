"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { key: "projects", href: "/projects", label: "My Projects" },
  { key: "explore", href: "/explore", label: "Explore" },
  { key: "admin", href: "/admin", label: "Admin" },
] as const

export function PrimaryNav({
  loggedIn = true,
  isAdmin = false,
}: {
  loggedIn?: boolean
  isAdmin?: boolean
}) {
  const pathname = usePathname()

  const items = NAV_ITEMS.filter((item) => {
    if (item.key === "projects") return loggedIn && !isAdmin
    if (item.key === "admin") return isAdmin
    return true
  })

  return (
    <nav className="flex items-center gap-2">
      {items.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-colors ${
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
