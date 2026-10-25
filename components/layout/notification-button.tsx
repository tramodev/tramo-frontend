// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { subscribeNotificationCount } from "@/lib/notification-stream"
import { useRouter } from "next/navigation"
import { ArrowBigUp, Award, Bell, Check, CheckCheck, GitFork, MessageCircle, Rocket, Share2, UserPlus, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type AppNotification,
} from "@/lib/notifications"

const ICONS: Record<AppNotification["type"], React.ComponentType<{ className?: string }>> = {
  UPVOTE: ArrowBigUp,
  FORK: GitFork,
  FOLLOW: UserPlus,
  BADGE: Award,
  FEATURED: Rocket,
  PUBLISH: Rocket,
  SHARE: Share2,
  COMMENT: MessageCircle,
}

function others(count: number) {
  const rest = count - 1
  return rest > 0 ? ` and ${rest} other${rest === 1 ? "" : "s"}` : ""
}

function notificationText(n: AppNotification) {
  switch (n.type) {
    case "UPVOTE":
      return <>{n.latestActorUsername}{others(n.count)} upvoted <strong>{n.projectTitle}</strong></>
    case "FORK":
      return <>{n.latestActorUsername}{others(n.count)} forked <strong>{n.projectTitle}</strong></>
    case "FOLLOW":
      return <>{n.latestActorUsername}{others(n.count)} followed you</>
    case "BADGE":
      return <>You earned the <strong>{n.badgeName}</strong> badge</>
    case "FEATURED":
      return <><strong>{n.projectTitle}</strong> was featured on Explore</>
    case "PUBLISH":
      return <>{n.latestActorUsername}{others(n.count)} published <strong>{n.projectTitle}</strong></>
    case "SHARE":
      return <>{n.latestActorUsername}{others(n.count)} shared <strong>{n.projectTitle}</strong></>
    case "COMMENT":
      return <>{n.latestActorUsername}{others(n.count)} commented on <strong>{n.projectTitle}</strong></>
  }
}

function notificationHref(n: AppNotification): string {
  if (n.type === "FOLLOW") return n.latestActorUsername ? `/u/${encodeURIComponent(n.latestActorUsername)}` : "/explore"
  if (n.type === "BADGE") return "/profile"
  if (n.type === "PUBLISH" || n.type === "SHARE" || n.type === "COMMENT") return n.projectId ? `/p/${n.projectId}` : "/explore"
  return n.projectId ? `/editor/${n.projectId}` : "/profile"
}

const PAGE_SIZE = 20

export function NotificationButton({ loggedIn, userId }: { loggedIn: boolean; userId: string | null }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const loadedPages = useRef(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const request = useRef(0)
  const isOpen = useRef(false)
  const router = useRouter()

  const refreshNotifications = useCallback(async (reset = false) => {
    const current = ++request.current
    setError(null)
    if (reset) {
      loadedPages.current = 1
      setNotifications(null)
      setHasMore(false)
    }
    setIsLoadingMore(false)
    try {
      const pages = await Promise.all(Array.from({ length: loadedPages.current }, (_, page) => getNotifications(page, PAGE_SIZE)))
      if (request.current !== current) return
      const items = new Map(pages.flatMap((page) => page.items).map((item) => [item.id, item]))
      setNotifications([...items.values()])
      setHasMore(pages.at(-1)?.hasMore ?? false)
    } catch {
      if (request.current === current) {
        if (reset) setNotifications([])
        setError("Couldn't load notifications. Close and reopen to retry.")
      }
    }
  }, [])

  function handleOpenChange(open: boolean) {
    isOpen.current = open
    if (open) return refreshNotifications(true)
    request.current++
  }

  useEffect(() => {
    if (!loggedIn || !userId) return
    return subscribeNotificationCount(userId, (count) => {
      setUnreadCount(count)
      if (isOpen.current) void refreshNotifications()
    })
  }, [loggedIn, userId, refreshNotifications])

  async function loadMore(event: React.MouseEvent) {
    event.preventDefault()
    const current = request.current
    setIsLoadingMore(true)
    setError(null)
    try {
      const page = await getNotifications(loadedPages.current, PAGE_SIZE)
      if (request.current !== current) return
      setNotifications((items) => [...new Map([...(items ?? []), ...page.items].map((item) => [item.id, item])).values()])
      setHasMore(page.hasMore)
      loadedPages.current++
    } catch {
      if (request.current === current) setError("Couldn't load older notifications. Please try again.")
    } finally {
      if (request.current === current) setIsLoadingMore(false)
    }
  }

  async function handleRead(event: React.MouseEvent, notification?: AppNotification) {
    event.preventDefault()
    event.stopPropagation()
    setIsUpdating(true)
    setError(null)
    try {
      if (notification) await markNotificationRead(notification.id)
      else await markAllNotificationsRead()
      if (isOpen.current) await refreshNotifications()
      setUnreadCount(await getUnreadCount())
    } catch {
      setError("Couldn't mark notifications as read. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleSelect(n: AppNotification) {
    if (!n.read) {
      try {
        await markNotificationRead(n.id)
      } catch {
        setError("Couldn't mark the notification as read. Please try again.")
      }
    }
    router.push(notificationHref(n))
  }

  async function handleDelete(event: React.MouseEvent, id: string) {
    event.preventDefault()
    event.stopPropagation()
    setIsUpdating(true)
    setError(null)
    try {
      await deleteNotification(id)
      if (isOpen.current) await refreshNotifications()
      setUnreadCount(await getUnreadCount())
    } catch {
      setError("Couldn't dismiss the notification. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  if (!loggedIn) return null

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[0.625rem] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={8} className="max-h-[min(32rem,80dvh)] w-80 max-w-[calc(100vw-1rem)] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <DropdownMenuItem asChild>
            <button
              type="button"
              aria-label="Mark all as read"
              disabled={isUpdating || unreadCount === 0}
              onClick={(event) => handleRead(event)}
              className="text-xs disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </button>
          </DropdownMenuItem>
        </div>
        {error && <p role="alert" className="px-2 py-2 text-sm text-destructive">{error}</p>}
        {notifications === null ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = ICONS[n.type]
            return (
              <div key={n.id} className="flex items-start gap-1 py-1">
                <DropdownMenuItem
                  onSelect={() => handleSelect(n)}
                  className="min-w-0 flex-1 items-start gap-2 py-2"
                >
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                      n.read
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className={`min-w-0 text-sm ${n.read ? "font-normal" : "font-bold"}`}>
                    {notificationText(n)}
                    <time dateTime={n.updatedDate} className="mt-1 block text-xs font-normal text-muted-foreground">
                      {new Date(n.updatedDate).toLocaleString()}
                    </time>
                  </span>
                </DropdownMenuItem>
                {!n.read && (
                  <DropdownMenuItem asChild>
                    <button
                      type="button"
                      aria-label="Mark as read"
                      disabled={isUpdating}
                      onClick={(event) => handleRead(event, n)}
                      className="mt-1 shrink-0 p-2 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <button
                    type="button"
                    onClick={(event) => handleDelete(event, n.id)}
                    aria-label="Dismiss notification"
                    disabled={isUpdating}
                    className="mt-1 shrink-0 p-2 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuItem>
              </div>
            )
          })
        )}
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="w-full rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {isLoadingMore ? "Loading..." : "Load older"}
          </button>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
