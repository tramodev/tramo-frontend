// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
"use client"

import { useState, useTransition } from "react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { updateNotificationPreferences } from "@/lib/notification-prefs"
import type { NotificationType } from "@/lib/notifications"

const TYPES: { value: NotificationType; label: string; desc: string }[] = [
  { value: "UPVOTE", label: "Upvotes", desc: "Someone upvotes one of your projects." },
  { value: "COMMENT", label: "Comments", desc: "Someone comments on one of your projects." },
  { value: "FORK", label: "Forks", desc: "Someone forks one of your projects." },
  { value: "FOLLOW", label: "New followers", desc: "Someone starts following you." },
  { value: "PUBLISH", label: "New projects", desc: "Someone you follow publishes a project." },
  { value: "SHARE", label: "Shared projects", desc: "Someone you follow shares a project." },
  { value: "BADGE", label: "Badges", desc: "You earn a badge." },
  { value: "FEATURED", label: "Featured", desc: "One of your projects gets featured." },
]

export function NotificationSettings({
  initialEnabled,
  initialMutedTypes,
}: {
  initialEnabled: boolean
  initialMutedTypes: NotificationType[]
}) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [muted, setMuted] = useState<NotificationType[]>(initialMutedTypes)
  const [saveError, setSaveError] = useState(false)
  const [, startTransition] = useTransition()

  function save(
    partial: Parameters<typeof updateNotificationPreferences>[0],
    rollback: () => void
  ) {
    setSaveError(false)
    startTransition(async () => {
      const result = await updateNotificationPreferences(partial)
      if (result.error) {
        rollback()
        setSaveError(true)
      }
    })
  }

  function handleEnabledChange(value: boolean) {
    const prev = enabled
    setEnabled(value)
    save({ notificationsEnabled: value }, () => setEnabled(prev))
  }

  function handleTypeChange(type: NotificationType, value: boolean) {
    const prev = muted
    const next = value ? muted.filter((t) => t !== type) : [...muted, type]
    setMuted(next)
    save({ mutedNotificationTypes: next }, () => setMuted(prev))
  }

  return (
    <>
      {saveError && (
        <div className="text-sm text-destructive">Couldn&apos;t save that change, try again.</div>
      )}

      <section>
        <h2 className="mb-1 text-lg font-medium">Notifications</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          What shows up in your notification bell.
        </p>
        <div className="flex items-center gap-4 rounded-2xl border border-border px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Enable notifications</div>
            <div className="mt-0.5 text-[13px] text-muted-foreground">
              Turn this off to stop receiving all notifications.
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={handleEnabledChange} />
        </div>
      </section>

      <section className={cn(!enabled && "opacity-50")}>
        <h2 className="mb-1 text-lg font-medium">Notify me about</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          {enabled
            ? "Pick which ones you want to keep."
            : "Notifications are off, so none of these apply right now."}
        </p>
        <div className="flex flex-col">
          {TYPES.map(({ value, label, desc }) => (
            <div key={value} className="flex items-center gap-4 border-t border-border py-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{label}</div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">{desc}</div>
              </div>
              <Switch
                checked={!muted.includes(value)}
                disabled={!enabled}
                onCheckedChange={(checked) => handleTypeChange(value, checked)}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
