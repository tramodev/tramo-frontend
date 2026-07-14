import { notFound } from "next/navigation"
import { isAdmin } from "@/lib/auth"
import { AdminDashboard } from "@/components/admin-dashboard"

export default async function AdminPage() {
  if (!(await isAdmin())) {
    notFound()
  }

  return (
    <main className="mx-auto w-full flex-1 px-8 py-8" style={{ maxWidth: 1000 }}>
      <AdminDashboard />
    </main>
  )
}
