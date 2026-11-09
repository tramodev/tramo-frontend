// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState } from "react"
import Link from "next/link"
import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { requestAccess } from "@/lib/project-members"

export function RequestAccess({ projectId }: { projectId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState("")

  const send = async () => {
    setState("sending")
    setError("")
    const result = await requestAccess(projectId).catch(() => null)
    if (result && !result.error) return setState("sent")
    setState("idle")
    setError(result?.status === 429 ? "Too many requests. Try again in a minute." : "Could not send the request. Try again.")
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <Lock aria-hidden="true" className="h-10 w-10 text-muted-foreground" />
      <h1 className="font-display text-2xl">You don&apos;t have access to this project</h1>
      {state === "sent"
        ? <p role="status" className="max-w-prose text-muted-foreground">Request sent. You&apos;ll be notified when the owner responds.</p>
        : <>
          <p className="max-w-prose text-muted-foreground">Ask the owner for access, or switch to an account that has it.</p>
          <Button onClick={send} disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Request access"}</Button>
        </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Link href="/projects" className="text-primary underline">Back to projects</Link>
    </main>
  )
}
