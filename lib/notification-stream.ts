import { getUnreadCount } from "@/lib/notifications"

export function subscribeNotificationCount(userId: string, onCount: (count: number) => void) {
  const shared = typeof BroadcastChannel !== "undefined" && Boolean(navigator.locks)
  const key = `tramo:notifications:${userId}`
  const channel = shared ? new BroadcastChannel(key) : null
  const abort = new AbortController()
  let source: EventSource | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let heartbeatTimer: ReturnType<typeof setTimeout> | undefined
  let releaseLeader: (() => void) | undefined
  let stopped = false
  let evicted = false
  let attempt = 0
  let count: number | null = null

  function receive(value: unknown) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return false
    count = value
    onCount(value)
    return true
  }

  function closeStream() {
    clearTimeout(timer)
    clearTimeout(heartbeatTimer)
    timer = undefined
    source?.close()
    source = null
  }

  async function poll() {
    try {
      const unreadCount = await getUnreadCount()
      if (stopped) return
      if (receive(unreadCount)) channel?.postMessage({ type: "unread-count", unreadCount })
    } catch {
    }
    if (!stopped) timer = setTimeout(poll, 5000)
  }

  function connect() {
    if (stopped || evicted) return
    const current = new EventSource("/api/notifications/stream")
    source = current
    function retry() {
      if (stopped || evicted || source !== current) return
      closeStream()
      const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt++, 5) * (1 + Math.random() * 0.2))
      timer = setTimeout(connect, delay)
    }
    function heartbeat() {
      if (stopped || source !== current) return
      clearTimeout(heartbeatTimer)
      heartbeatTimer = setTimeout(retry, 12000)
    }
    heartbeat()
    current.addEventListener("heartbeat", heartbeat)
    current.addEventListener("unread-count", (event) => {
      if (stopped || evicted || source !== current) return
      try {
        const data = JSON.parse((event as MessageEvent<string>).data)
        if (!receive(data?.unreadCount)) return
        heartbeat()
        attempt = 0
        channel?.postMessage({ type: "unread-count", unreadCount: data.unreadCount })
      } catch {
      }
    })
    current.addEventListener("evicted", () => {
      if (stopped || source !== current) return
      evicted = true
      closeStream()
      channel?.postMessage({ type: "evicted" })
      void poll()
    })
    current.onerror = retry
  }

  if (channel) {
    channel.onmessage = (event: MessageEvent) => {
      if (stopped || !event.data) return
      if (event.data.type === "evicted") {
        evicted = true
        closeStream()
      } else if (event.data.type === "unread-count") {
        receive(event.data.unreadCount)
      } else if (event.data.type === "snapshot-request" && releaseLeader && count !== null) {
        channel.postMessage({ type: "unread-count", unreadCount: count })
      }
    }
    channel.postMessage({ type: "snapshot-request" })
    void navigator.locks.request(key, { signal: abort.signal }, async () => {
      if (stopped) return
      await new Promise<void>((resolve) => {
        releaseLeader = resolve
        if (evicted) void poll()
        else connect()
      })
    }).catch(() => {
      if (!stopped) connect()
    })
  } else {
    connect()
  }

  return () => {
    stopped = true
    closeStream()
    abort.abort()
    releaseLeader?.()
    channel?.close()
  }
}
