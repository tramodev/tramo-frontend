"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { GitFork } from "lucide-react"
import { forkProject } from "@/lib/projects-store"
import { Button } from "@/components/ui/button"

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
      <Button
        type="button"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="relative z-10"
        title={error ? "Fork failed, try again" : "Fork this project into your account"}
      >
        <GitFork className="h-[13px] w-[13px]" />
        {isPending ? "Forking..." : "Fork"}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      title={error ? "Fork failed, try again" : "Fork this project into your account"}
    >
      <GitFork className="h-4 w-4" />
      {isPending ? "Forking..." : "Fork"}
    </Button>
  )
}
