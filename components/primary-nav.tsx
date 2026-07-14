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
            className="text-[13px] uppercase transition-colors"
            style={{
              letterSpacing: "0.08em",
              fontWeight: active ? 700 : 400,
              color: active ? "var(--color-text)" : "var(--color-neutral-600)",
              borderBottom: active ? "2px solid var(--color-accent)" : "2px solid transparent",
              paddingBottom: "2px",
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
