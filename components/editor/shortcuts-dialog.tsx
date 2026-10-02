"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const GROUPS: { title: string; shortcuts: [string, string][] }[] = [
  {
    title: "Navigate",
    shortcuts: [
      ["⌘P", "Find a note in this project"],
      ["↑ / ↓ at start or end", "Previous / next note"],
      ["⌘⌥↑ / ⌘⌥↓", "Previous / next note in the trail"],
      ["Esc", "Move to the toolbar and back"],
      ["⌘F", "Find and replace in this note"],
    ],
  },
  {
    title: "Insert",
    shortcuts: [
      ["/", "Insert menu"],
      ["@", "Insert a note reference"],
      ["[[", "Insert a note reference"],
      ["⌘E", "Inline equation"],
      ["⌘⇧E", "Block equation"],
      ["⌘K", "Link"],
      ["⌘↵", "New note in the trail"],
    ],
  },
  {
    title: "Write",
    shortcuts: [
      ["⌘B / ⌘I / ⌘U", "Bold / italic / underline"],
      ["Tab / ⇧Tab", "Indent / outdent lists"],
      ["⌘Z / ⌘⇧Z", "Undo / redo"],
      ["# ## ###", "Headings (followed by a space)"],
      ["- / 1. / >", "List, numbered list, quote"],
    ],
  },
]

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      if (!open) previousFocusRef.current = document.activeElement as HTMLElement | null
      setOpen(!open)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-lg"
        onCloseAutoFocus={(event) => {
          const previous = previousFocusRef.current
          if (previous === null || !previous.isConnected) return
          event.preventDefault()
          previous.focus({ preventScroll: true })
        }}
      >
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>⌘/ opens and closes this dialog. Use Ctrl instead of ⌘ on Windows and Linux.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          {GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {group.title}
              </p>
              {group.shortcuts.map(([keys, label]) => (
                <div key={keys} className="flex items-baseline justify-between gap-4">
                  <span className="text-sm">{label}</span>
                  <kbd className="shrink-0 rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
