"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { getPatreonAuthorizeUrl, syncPatreonSubscription } from "@/lib/patreon"
import type { SubscriptionStatus } from "@/lib/subscription"

export function usePatreonConnection(onSupporter: (status: SubscriptionStatus) => void) {
  const [pending, startTransition] = useTransition()
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!waiting) return
    let disposed = false
    let checking = false
    let polls = 0

    async function checkStatus() {
      if (disposed || checking || document.visibilityState !== "visible") return
      checking = true
      try {
        const status = await syncPatreonSubscription()
        if (disposed) return
        setError(null)
        if (status.supporter) {
          disposed = true
          window.clearInterval(interval)
          setWaiting(false)
          onSupporter(status)
          router.refresh()
        }
      } catch {
        if (!disposed) setError("Couldn’t check your membership. We’ll try again when you return to this tab.")
      } finally {
        checking = false
      }
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      if (++polls >= 8) window.clearInterval(interval)
      void checkStatus()
    }, 15000)
    window.addEventListener("focus", checkStatus)
    document.addEventListener("visibilitychange", checkStatus)

    return () => {
      disposed = true
      window.clearInterval(interval)
      window.removeEventListener("focus", checkStatus)
      document.removeEventListener("visibilitychange", checkStatus)
    }
  }, [waiting, onSupporter, router])

  function connect() {
    if (pending) return
    setError(null)
    const tab = window.open("", "_blank")
    if (!tab) {
      setError("Allow pop-ups to continue with Patreon without leaving Tramo.")
      return
    }
    tab.opener = null
    startTransition(async () => {
      try {
        const url = await getPatreonAuthorizeUrl()
        if (tab.closed) return
        tab.location.href = url
        setWaiting(true)
      } catch {
        tab.close()
        setError("Couldn’t connect to Patreon. Please try again.")
      }
    })
  }

  return { connect, pending, waiting, error }
}
