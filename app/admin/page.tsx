import { notFound } from "next/navigation"
import { archivo } from "@/lib/fonts"
import "../modernist.css"
import { AppHeader } from "@/components/app-header"
import { isAdmin } from "@/lib/auth"
import { AdminDashboard } from "@/components/admin-dashboard"

export default async function AdminPage() {
  const admin = await isAdmin()
  if (!admin) {
    notFound()
  }

  return (
    <div className={`modernist flex min-h-svh flex-col ${archivo.className}`} style={{ background: "var(--color-bg)" }}>
      <AppHeader active="admin" homeHref="/explore" loggedIn isAdmin={admin} />
      <main className="mx-auto w-full flex-1 px-8 py-8" style={{ maxWidth: 1000 }}>
        <AdminDashboard />
      </main>
    </div>
  )
}
