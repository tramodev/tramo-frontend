const NAV_ITEMS = [
  { key: "projects", href: "/projects", label: "My Projects" },
  { key: "explore", href: "/explore", label: "Explore" },
  { key: "admin", href: "/admin", label: "Admin" },
] as const

export type NavItem = (typeof NAV_ITEMS)[number]

export function getNavItems(loggedIn: boolean, isAdmin: boolean) {
  return NAV_ITEMS.filter((item) => {
    if (item.key === "projects") return loggedIn && !isAdmin
    if (item.key === "admin") return isAdmin
    return true
  })
}
