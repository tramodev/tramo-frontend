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
    <nav className="flex items-center gap-4">
      {items.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`text-[13px] uppercase transition-colors tracking-[0.08em] pb-0.5 border-b-2 ${
              active
                ? "font-bold text-(--color-text) border-(--color-accent)"
                : "font-normal text-(--color-neutral-600) border-transparent"
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
