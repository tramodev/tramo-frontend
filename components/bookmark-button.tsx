"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bookmark } from "lucide-react"
import { toggleProjectBookmark } from "@/lib/projects-store"

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
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={bookmarked}
      title={bookmarked ? "Remove bookmark" : "Bookmark this project"}
      className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center transition-colors hover:bg-muted"
      style={{
        color: bookmarked ? "var(--color-accent)" : "var(--color-neutral-600)",
      }}
    >
      <Bookmark className="h-4 w-4" fill={bookmarked ? "currentColor" : "none"} />
    </button>
  )
}
