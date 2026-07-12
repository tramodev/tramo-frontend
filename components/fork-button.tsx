"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { GitFork } from "lucide-react"
import { forkProject } from "@/lib/projects-store"

export function ForkButton({
  projectId,
  isLoggedIn,
}: {
  projectId: string
  isLoggedIn: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(false)
  const router = useRouter()

  function handleClick() {
    if (!isLoggedIn) {
      router.push("/login")
      return
    }
    if (isPending) return

    setError(false)
    startTransition(async () => {
      try {
        const forked = await forkProject(projectId)
        router.push(`/dashboard/${forked.id}`)
      } catch {
        setError(true)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="btn btn-secondary"
      title={error ? "Fork failed, try again" : "Fork this project into your account"}
    >
      <GitFork className="h-4 w-4" />
      {isPending ? "Forking..." : "Fork"}
    </button>
  )
}
