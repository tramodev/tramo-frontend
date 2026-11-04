// Copyright (C) 2026 Ezequiel Martino
// SPDX-License-Identifier: AGPL-3.0-only
import { useCallback, useEffect, useRef, type RefObject } from "react"
import { visibleItemAtLine } from "@/app/editor/trail-navigation"

export function useScrollSpy({
  root,
  slots,
  ids,
  enabled,
  onVisible,
}: {
  root: RefObject<HTMLElement | null>
  slots: RefObject<Map<string, HTMLElement>>
  ids: string[]
  enabled: boolean
  onVisible: (id: string) => void
}) {
  const onVisibleRef = useRef(onVisible)
  useEffect(() => {
    onVisibleRef.current = onVisible
  })

  const pinned = useRef(false)
  const pin = useCallback(() => {
    pinned.current = true
  }, [])

  const key = ids.join("|")

  useEffect(() => {
    const container = root.current
    if (!enabled || !container) return
    const order = key.split("|")
    let frame = 0
    let last = ""

    const measure = () => {
      frame = 0
      if (pinned.current) return
      const line = container.getBoundingClientRect().top + container.clientHeight * 0.3
      const positions = order.flatMap((id) => {
        const element = slots.current.get(id);
        return element ? [{ id, top: element.getBoundingClientRect().top }] : [];
      });
      const current = visibleItemAtLine(positions, line);
      if (!current || current === last) return
      last = current
      onVisibleRef.current(current)
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    const unpin = () => {
      pinned.current = false
    }
    const unpinEvents = ["wheel", "touchstart", "pointerdown"]

    container.addEventListener("scroll", onScroll, { passive: true })
    for (const type of unpinEvents) container.addEventListener(type, unpin, { passive: true })
    const observer = new ResizeObserver(onScroll)
    observer.observe(container)
    for (const element of slots.current.values()) observer.observe(element)
    onScroll()
    return () => {
      observer.disconnect()
      container.removeEventListener("scroll", onScroll)
      for (const type of unpinEvents) container.removeEventListener(type, unpin)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [root, slots, key, enabled])
  return pin
}
