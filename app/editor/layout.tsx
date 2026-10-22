// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getMyProfile } from "@/lib/profile"
import { EditorWorkspace } from "@/app/editor/editor-workspace"

export const metadata: Metadata = {
  title: "Editor",
  robots: { index: false, follow: false },
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const profile = await getMyProfile()
  if (!profile) redirect('/login')
  return <div className="contents"><EditorWorkspace user={{ userId: profile.userId, username: profile.username, imageUrl: profile.imageUrl }} />{children}</div>
}
