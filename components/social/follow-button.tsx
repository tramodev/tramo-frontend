"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, UserCheck } from "lucide-react"
import { toggleFollow } from "@/lib/public-profile"

export function FollowButton({
  username,
  initialFollowing,
  isLoggedIn,
}: {
  username: string
  initialFollowing: boolean
  isLoggedIn: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(false)
  const router = useRouter()

  function handleClick() {
    if (!isLoggedIn) {
      router.push("/login")
      return
    }
    if (isPending) return

    const prevFollowing = following
    setFollowing(!prevFollowing)
    setError(false)

    startTransition(async () => {
      try {
        const result = await toggleFollow(username)
        setFollowing(result.following)
        router.refresh()
      } catch {
        setFollowing(prevFollowing)
        setError(true)
      }
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center gap-2 rounded-full py-2 px-3.5 text-[13px] font-medium transition-colors ${
          following
            ? "border border-input text-muted-foreground hover:bg-muted"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {following ? <UserCheck className="h-[15px] w-[15px]" /> : <UserPlus className="h-[15px] w-[15px]" />}
        {following ? "Following" : "Follow"}
      </button>
      {error && (
        <span className="absolute left-0 top-full mt-1 whitespace-nowrap text-[11px] font-medium text-destructive">
          Couldn&apos;t update, try again
        </span>
      )}
    </div>
  )
}
