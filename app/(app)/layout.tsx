import { AppHeader } from "@/components/app-header"
import { Footer } from "@/components/footer"
import { isLoggedIn } from "@/lib/auth"
import { isAdmin } from "@/lib/session"
import { getHomeHref } from "@/lib/nav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [loggedIn, admin, homeHref] = await Promise.all([isLoggedIn(), isAdmin(), getHomeHref()])

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader homeHref={admin ? "/explore" : homeHref} loggedIn={loggedIn} isAdmin={admin} />
      {children}
      <Footer />
    </div>
  )
}
