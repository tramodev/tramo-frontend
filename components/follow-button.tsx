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
        className="inline-flex items-center gap-2 rounded-md text-[13px] font-bold transition-colors"
        style={
          following
            ? { padding: "8px 14px", border: "2px solid var(--color-divider)", color: "var(--color-neutral-600)" }
            : { padding: "8px 14px", background: "var(--color-accent)", color: "#fff" }
        }
      >
        {following ? <UserCheck className="h-[15px] w-[15px]" /> : <UserPlus className="h-[15px] w-[15px]" />}
        {following ? "Following" : "Follow"}
      </button>
      {error && (
        <span
          className="absolute left-0 top-full mt-1 whitespace-nowrap text-[11px] font-semibold"
          style={{ color: "var(--color-accent)" }}
        >
          Couldn&apos;t update, try again
        </span>
      )}
    </div>
  )
}
