// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { isAdmin } from "@/lib/session"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

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
