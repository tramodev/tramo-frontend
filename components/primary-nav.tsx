"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { getNavItems } from "@/lib/nav-items"

export function PrimaryNav({
  loggedIn = true,
  isAdmin = false,
}: {
  loggedIn?: boolean
  isAdmin?: boolean
}) {
  const pathname = usePathname()
  const items = getNavItems(loggedIn, isAdmin)

  return (
    <nav className="flex items-center gap-2">
      {items.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`inline-flex h-10 items-center rounded-full px-5 text-base font-medium transition-colors ${
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
