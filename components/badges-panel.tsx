"use client"

import { useState } from "react"
import { Crown, Eye, GitFork, Lock, Rocket, Sparkles, Star, TrendingUp, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Badge } from "@/lib/profile"

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  first_publish: Rocket,
  prolific: Sparkles,
  rising_star: Star,
  crowd_favorite: Users,
  on_the_map: Eye,
  trendsetter: TrendingUp,
  forked_once: GitFork,
  remix_king: Crown,
}

function BadgeIcon({ badge, size = 16 }: { badge: Badge; size?: number }) {
  const Icon = BADGE_ICONS[badge.code] ?? Star
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: size + 16,
        height: size + 16,
        background: badge.earned ? "var(--color-accent)" : "var(--color-neutral-200)",
        color: badge.earned ? "#fff" : "var(--color-neutral-600)",
      }}
      title={badge.name}
    >
      {badge.earned ? <Icon style={{ width: size, height: size }} /> : <Lock style={{ width: size - 2, height: size - 2 }} />}
    </span>
  )
}

export function BadgesPanel({ badges }: { badges: Badge[] }) {
  const [open, setOpen] = useState(false)
  const earned = badges.filter((badge) => badge.earned)

  if (badges.length === 0) return null

  return (
    <>
      <div className="flex items-center gap-3">
        {earned.length > 0 ? (
          <div className="flex items-center gap-1">
            {earned.map((badge) => (
              <BadgeIcon key={badge.code} badge={badge} />
            ))}
          </div>
        ) : (
          <span className="text-xs" style={{ color: "var(--color-neutral-600)" }}>
            None yet
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-bold transition-colors hover:text-[var(--color-accent)]"
          style={{ color: "var(--color-neutral-700)" }}
        >
          View all ({earned.length}/{badges.length})
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Badges</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            {badges.map((badge) => {
              const pct = Math.round((badge.progress / badge.target) * 100)
              return (
                <div
                  key={badge.code}
                  className="rounded-lg"
                  style={{
                    padding: "16px 18px",
                    border: badge.earned ? "2px solid var(--color-accent)" : "2px solid var(--color-divider)",
                    opacity: badge.earned ? 1 : 0.7,
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <BadgeIcon badge={badge} />
                    {badge.earned && (
                      <span
                        className="text-[10px] font-bold uppercase"
                        style={{ letterSpacing: "0.06em", color: "var(--color-accent)" }}
                      >
                        Earned
                      </span>
                    )}
                  </div>
                  <div className="mb-1 text-sm font-bold">{badge.name}</div>
                  <div className="mb-2 text-xs" style={{ color: "var(--color-neutral-600)" }}>
                    {badge.description}
                  </div>
                  {!badge.earned && (
                    <>
                      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--color-neutral-200)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--color-accent)" }} />
                      </div>
                      <div className="mt-1 text-[11px] font-semibold" style={{ color: "var(--color-neutral-600)" }}>
                        {badge.progress.toLocaleString()} / {badge.target.toLocaleString()}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
