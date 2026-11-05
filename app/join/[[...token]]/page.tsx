// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { acceptShareLink } from "@/lib/project-members"
import { PENDING_JOIN_KEY } from "@/lib/pending-join"

export default function JoinPage() {
  const { token: segments } = useParams<{ token?: string[] }>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const fromUrl = segments?.[0]
    if (fromUrl) {
      sessionStorage.setItem(PENDING_JOIN_KEY, fromUrl)
      window.history.replaceState(null, "", "/join")
    }
    const token = fromUrl ?? sessionStorage.getItem(PENDING_JOIN_KEY)
    if (!token) {
      router.replace("/projects")
      return
    }
    acceptShareLink(token).then((result) => {
      if (result.status === 401) {
        router.replace("/login")
        return
      }
      sessionStorage.removeItem(PENDING_JOIN_KEY)
      if (result.data) router.replace(`/editor/${result.data.projectId}`)
      else setError(result.status === 404 ? "This invite link is invalid, expired or was revoked." : result.error)
    }).catch(() => setError("Could not open this invite. Try again."))
  }, [segments, router])

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      {error ? <>
        <p role="alert">{error}</p>
        <Link href="/projects" className="text-primary underline">Back to projects</Link>
      </> : <p role="status" className="flex items-center gap-2 text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        Joining project…
      </p>}
    </main>
  )
}
