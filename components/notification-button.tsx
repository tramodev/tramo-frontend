import { Bell } from "lucide-react"

export function NotificationButton() {
  return (
    <button
      type="button"
      aria-label="Notifications"
      className="flex shrink-0 items-center justify-center transition-colors hover:bg-muted"
      style={{ color: "var(--color-neutral-600)" }}
    >
      <Bell className="h-5 w-5" />
    </button>
  )
}
