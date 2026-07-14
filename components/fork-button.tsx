"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { GitFork } from "lucide-react"
import { forkProject } from "@/lib/projects-store"

export function ForkButton({
  projectId,
  isLoggedIn,
  variant = "outline",
}: {
  projectId: string
  isLoggedIn: boolean
  variant?: "outline" | "filled"
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
        router.push(`/editor/${forked.id}`)
      } catch {
        setError(true)
      }
    })
  }

  if (variant === "filled") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="relative z-10 flex shrink-0 items-center gap-2 rounded-md text-xs font-bold transition-colors hover:bg-[var(--color-accent-600)]"
        style={{ padding: "7px 12px", background: "var(--color-accent)", color: "#fff" }}
        title={error ? "Fork failed, try again" : "Fork this project into your account"}
      >
        <GitFork className="h-[13px] w-[13px]" />
        {isPending ? "Forking..." : "Fork"}
      </button>
    )
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
