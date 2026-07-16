"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowBigUp, Award, Bell, GitFork, Rocket, UserPlus, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getNotifications,
  getUnreadCount,
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
  }
}

function notificationHref(n: AppNotification): string {
  if (n.type === "FOLLOW") return n.latestActorUsername ? `/u/${encodeURIComponent(n.latestActorUsername)}` : "/explore"
  if (n.type === "BADGE") return "/profile"
  return n.projectId ? `/editor/${n.projectId}` : "/profile"
}

export function NotificationButton() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    fetch("/api/session")
      .then((res) => res.json())
      .then((data: { isLoggedIn: boolean }) => {
        if (cancelled) return
        setLoggedIn(data.isLoggedIn)
        if (data.isLoggedIn) {
          getUnreadCount().then((count) => {
            if (!cancelled) setUnreadCount(count)
          })
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!loggedIn) return

    const source = new EventSource("/api/notifications/stream")
    source.addEventListener("unread-count", (event) => {
      const data: { unreadCount: number } = JSON.parse((event as MessageEvent<string>).data)
      setUnreadCount(data.unreadCount)
    })

    return () => source.close()
  }, [loggedIn])

  function handleOpenChange(open: boolean) {
    if (!open || notifications !== null) return
    getNotifications().then((items) => {
      setNotifications(items)
      markAllNotificationsRead()
      setUnreadCount(0)
    })
  }

  function handleSelect(n: AppNotification) {
    router.push(notificationHref(n))
  }

  function handleDelete(event: React.MouseEvent, id: string) {
    event.preventDefault()
    event.stopPropagation()
    setNotifications((current) => current?.filter((n) => n.id !== id) ?? current)
    deleteNotification(id)
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
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
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
              <DropdownMenuItem
                key={n.id}
                onSelect={() => handleSelect(n)}
                className="group relative items-start gap-2 py-2 pr-7"
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
                </span>
                <button
                  type="button"
                  onClick={(event) => handleDelete(event, n.id)}
                  aria-label="Dismiss notification"
                  className="absolute right-1 top-1.5 shrink-0 rounded-md p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
