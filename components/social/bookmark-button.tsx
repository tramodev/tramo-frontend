"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bookmark } from "lucide-react"
import { toggleProjectBookmark } from "@/lib/projects-store"
import { BurstParticles } from "@/components/social/burst-particles"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function BookmarkButton({
  projectId,
  initialBookmarked,
  isLoggedIn,
}: {
  projectId: string
  initialBookmarked: boolean
  isLoggedIn: boolean
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const [burstId, setBurstId] = useState(0)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) {
      router.push("/login")
      return
    }
    if (isPending) return

    const prevBookmarked = bookmarked
    setBookmarked(!prevBookmarked)
    if (!prevBookmarked) setBurstId((n) => n + 1)

    startTransition(async () => {
      try {
        const result = await toggleProjectBookmark(projectId)
        setBookmarked(result)
      } catch {
        setBookmarked(prevBookmarked)
      }
    })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          aria-pressed={bookmarked}
          className={`relative z-10 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted ${
            bookmarked ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <span key={burstId} className="relative inline-flex">
            <Bookmark
              className={burstId > 0 ? "h-4 w-4 burst-pop" : "h-4 w-4"}
              fill={bookmarked ? "currentColor" : "none"}
            />
            {burstId > 0 && <BurstParticles />}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{bookmarked ? "Remove bookmark" : "Bookmark this project"}</TooltipContent>
    </Tooltip>
  )
}
