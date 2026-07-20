"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", desc: "Anyone can see your profile, published projects, and activity." },
  { value: "private", label: "Private", desc: "Your profile is hidden. Published projects stay visible on Explore." },
] as const

const COMMENT_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "following", label: "People I follow" },
  { value: "noone", label: "No one" },
] as const

// ponytail: local-only state, there's no privacy-prefs API yet — wire this up to a
// server action (lib/privacy.ts) once the backend exposes one.
export function PrivacySettings() {
  const [visibility, setVisibility] = useState<(typeof VISIBILITY_OPTIONS)[number]["value"]>("public")
  const [showUpvotes, setShowUpvotes] = useState(true)
  const [allowForks, setAllowForks] = useState(true)
  const [comments, setComments] = useState<(typeof COMMENT_OPTIONS)[number]["value"]>("everyone")

  return (
    <>
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
                onClick={() => setVisibility(option.value)}
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
            <Switch checked={showUpvotes} onCheckedChange={setShowUpvotes} />
          </div>
          <div className="flex items-center gap-4 border-t border-border py-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Allow forks</div>
              <div className="mt-0.5 text-[13px] text-muted-foreground">
                Let others fork your published projects as a starting point.
              </div>
            </div>
            <Switch checked={allowForks} onCheckedChange={setAllowForks} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Comments</h2>
        <p className="mb-4 text-sm text-muted-foreground">Who can comment on your published projects.</p>
        <SegmentedControl options={COMMENT_OPTIONS} value={comments} onChange={setComments} />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Blocked users</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Blocked users can&apos;t follow you, comment on, or fork your projects.
        </p>
        <p className="text-sm text-muted-foreground italic">You haven&apos;t blocked anyone.</p>
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
