import { archivo } from "@/lib/fonts"
import "../modernist.css"
import { AppHeader } from "@/components/app-header"
import { Footer } from "@/components/footer"
import { isLoggedIn, isAdmin } from "@/lib/auth"
import { getHomeHref } from "@/lib/nav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [loggedIn, admin, homeHref] = await Promise.all([isLoggedIn(), isAdmin(), getHomeHref()])

  return (
    <div className={`modernist flex min-h-svh flex-col ${archivo.className}`} style={{ background: "var(--color-bg)" }}>
      <AppHeader homeHref={admin ? "/explore" : homeHref} loggedIn={loggedIn} isAdmin={admin} />
      {children}
      <Footer />
    </div>
  )
}
