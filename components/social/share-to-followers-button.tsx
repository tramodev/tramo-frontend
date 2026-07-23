"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Share2 } from "lucide-react"
import { shareProjectToFollowers } from "@/lib/projects-store"

export function ShareToFollowersButton({
  projectId,
  isLoggedIn,
}: {
  projectId: string
  isLoggedIn: boolean
}) {
  const [shared, setShared] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) {
      router.push("/login")
      return
    }
    if (isPending || shared) return

    startTransition(async () => {
      try {
        await shareProjectToFollowers(projectId)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      } catch {
        // silently ignore — not critical enough to surface an error state
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title="Share with your followers"
      className={`relative z-10 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted ${
        shared ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
    </button>
  )
}
