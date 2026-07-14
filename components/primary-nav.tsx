import Link from "next/link"

const NAV_ITEMS = [
  { key: "projects", href: "/projects", label: "My Projects" },
  { key: "explore", href: "/explore", label: "Explore" },
  { key: "admin", href: "/admin", label: "Admin" },
] as const

export function PrimaryNav({
  active,
  loggedIn = true,
  isAdmin = false,
}: {
  active?: "projects" | "explore" | "admin"
  loggedIn?: boolean
  isAdmin?: boolean
}) {
  const items = NAV_ITEMS.filter((item) => {
    if (item.key === "projects") return loggedIn && !isAdmin
    if (item.key === "admin") return isAdmin
    return true
  })

  return (
    <nav className="flex items-center gap-4">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className="text-[13px] uppercase transition-colors"
          style={{
            letterSpacing: "0.08em",
            fontWeight: item.key === active ? 700 : 400,
            color: item.key === active ? "var(--color-text)" : "var(--color-neutral-600)",
            borderBottom: item.key === active ? "2px solid var(--color-accent)" : "2px solid transparent",
            paddingBottom: "2px",
          }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
