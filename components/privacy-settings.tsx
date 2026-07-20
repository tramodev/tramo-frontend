"use client"

import { useState, useTransition } from "react"
import { Switch } from "@/components/ui/switch"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { updatePrivacySettings, type ProfileVisibility, type CommentsPolicy } from "@/lib/privacy"
import { toggleBlock, getBlockedUsersPage, type BlockedUser } from "@/lib/blocked-users"

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", desc: "Anyone can see your profile, published projects, and activity." },
  { value: "private", label: "Private", desc: "Your profile is hidden. Published projects stay visible on Explore." },
] as const

const COMMENT_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "following", label: "People I follow" },
  { value: "noone", label: "No one" },
] as const

function initial(username: string) {
  return username.charAt(0).toUpperCase()
}

export function PrivacySettings({
  initialVisibility,
  initialShowUpvotes,
  initialAllowForks,
  initialCommentsPolicy,
  initialBlockedUsers,
  initialBlockedUsersHasMore,
  pageSize,
}: {
  initialVisibility: ProfileVisibility
  initialShowUpvotes: boolean
  initialAllowForks: boolean
  initialCommentsPolicy: CommentsPolicy
  initialBlockedUsers: BlockedUser[]
  initialBlockedUsersHasMore: boolean
  pageSize: number
}) {
  const [visibility, setVisibility] = useState<ProfileVisibility>(initialVisibility)
  const [showUpvotes, setShowUpvotes] = useState(initialShowUpvotes)
  const [allowForks, setAllowForks] = useState(initialAllowForks)
  const [comments, setComments] = useState<CommentsPolicy>(initialCommentsPolicy)
  const [saveError, setSaveError] = useState(false)
  const [, startTransition] = useTransition()

  function save(partial: Parameters<typeof updatePrivacySettings>[0], rollback: () => void) {
    setSaveError(false)
    startTransition(async () => {
      const result = await updatePrivacySettings(partial)
      if (result.error) {
        rollback()
        setSaveError(true)
      }
    })
  }

  function handleVisibilityChange(value: ProfileVisibility) {
    const prev = visibility
    setVisibility(value)
    save({ profileVisibility: value }, () => setVisibility(prev))
  }

  function handleShowUpvotesChange(value: boolean) {
    const prev = showUpvotes
    setShowUpvotes(value)
    save({ showUpvotes: value }, () => setShowUpvotes(prev))
  }

  function handleAllowForksChange(value: boolean) {
    const prev = allowForks
    setAllowForks(value)
    save({ allowForks: value }, () => setAllowForks(prev))
  }

  function handleCommentsChange(value: CommentsPolicy) {
    const prev = comments
    setComments(value)
    save({ commentsPolicy: value }, () => setComments(prev))
  }

  return (
    <>
      {saveError && (
        <div className="text-sm text-destructive">Couldn&apos;t save that change, try again.</div>
      )}

      <section>
        <h2 className="mb-1 text-lg font-medium">Profile visibility</h2>
        <p className="mb-4 text-sm text-muted-foreground">Control who can see your profile page.</p>
        <div className="flex flex-col gap-3">
          {VISIBILITY_OPTIONS.map((option) => {
            const selected = visibility === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleVisibilityChange(option.value)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                  selected ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-border hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "mt-px flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    selected ? "border-primary" : "border-input"
                  )}
                >
                  {selected && <span className="size-2.5 rounded-full bg-primary" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">{option.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Activity</h2>
        <p className="mb-2 text-sm text-muted-foreground">What others can see and do with your work.</p>
        <div className="flex flex-col">
          <div className="flex items-center gap-4 border-t border-border py-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Show upvotes on my profile</div>
              <div className="mt-0.5 text-[13px] text-muted-foreground">Let others see which projects you&apos;ve upvoted.</div>
            </div>
            <Switch checked={showUpvotes} onCheckedChange={handleShowUpvotesChange} />
          </div>
          <div className="flex items-center gap-4 border-t border-border py-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Allow forks</div>
              <div className="mt-0.5 text-[13px] text-muted-foreground">
                Let others fork your published projects as a starting point.
              </div>
            </div>
            <Switch checked={allowForks} onCheckedChange={handleAllowForksChange} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Comments</h2>
        <p className="mb-4 text-sm text-muted-foreground">Who can comment on your published projects.</p>
        <SegmentedControl options={COMMENT_OPTIONS} value={comments} onChange={handleCommentsChange} />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Blocked users</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Blocked users can&apos;t follow you, comment on, or fork your projects.
        </p>
        <BlockedUsersPanel
          initialItems={initialBlockedUsers}
          initialHasMore={initialBlockedUsersHasMore}
          pageSize={pageSize}
        />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Your data</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Download a copy of your projects, comments, and account data.
        </p>
        <Button variant="outline">Request data export</Button>
      </section>
    </>
  )
}

function BlockedUsersPanel({
  initialItems,
  initialHasMore,
  pageSize,
}: {
  initialItems: BlockedUser[]
  initialHasMore: boolean
  pageSize: number
}) {
  const [items, setItems] = useState(initialItems)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLoadMore() {
    if (isLoading) return
    setIsLoading(true)
    try {
      const result = await getBlockedUsersPage(page, pageSize)
      setItems((prev) => [...prev, ...result.items])
      setPage((prev) => prev + 1)
      setHasMore(result.hasMore)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUnblock(username: string) {
    setItems((prev) => prev.filter((item) => item.username !== username))
    try {
      await toggleBlock(username)
    } catch {
      // best-effort; a stale row disappearing from the list either way is harmless
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground italic">You haven&apos;t blocked anyone.</p>
  }

  return (
    <>
      <div className="flex flex-col">
        {items.map((item) => (
          <div key={item.username} className="flex items-center gap-4 rounded-2xl py-3">
            <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display text-lg font-medium w-12 h-12 bg-primary text-primary-foreground">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initial(item.username)
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{item.username}</div>
              {item.bio && <div className="truncate text-xs text-muted-foreground">{item.bio}</div>}
            </div>
            <Button variant="outline" size="sm" onClick={() => handleUnblock(item.username)}>
              Unblock
            </Button>
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={handleLoadMore} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </>
  )
}
