import { notFound } from "next/navigation"
import { isAdmin } from "@/lib/session"
import { AdminDashboard } from "@/components/admin-dashboard"

export default async function AdminPage() {
  if (!(await isAdmin())) {
    notFound()
  }

  return (
    <main className="mx-auto w-full flex-1 px-8 py-8 max-w-[1000px]">
      <AdminDashboard />
    </main>
  )
}
