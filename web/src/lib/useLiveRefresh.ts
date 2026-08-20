import { useEffect, useRef } from "react"

/**
 * Keep a fetched view current without a page reload.
 *
 * Three triggers, in order of how often they actually matter:
 *
 *   returning to the tab   — the common case by far. HR answers in one window,
 *                            you switch back to the employee window, and it is
 *                            already there. No wait at all.
 *   coming back online     — a dropped connection should not leave stale data
 *                            on screen once it returns.
 *   an interval            — the backstop, for a tab left open and watched.
 *
 * WHY NOT A SOCKET
 * Notifications here travel one way, server to client, so a WebSocket's second
 * direction is dead weight — it would add a socket server, an auth handshake,
 * reconnection handling and per-user rooms for a message that can arrive thirty
 * seconds late without anyone minding. If this ever needs true push, the right
 * answer is server-sent events, which this codebase already speaks: the chat
 * stream is SSE. That is an upgrade to reach for when latency actually matters,
 * not before.
 *
 * The interval is paused while the tab is hidden. A background tab polling
 * forever is how a free database tier gets spent on nobody looking.
 */
export function useLiveRefresh(refresh: () => void, intervalMs = 45_000): void {
  // Held in a ref so a caller passing a fresh closure each render does not
  // restart the interval on every render.
  const latest = useRef(refresh)
  useEffect(() => {
    latest.current = refresh
  }, [refresh])

  useEffect(() => {
    const run = () => latest.current()

    const onVisible = () => {
      if (document.visibilityState === "visible") run()
    }

    let timer: number | undefined
    const start = () => {
      window.clearInterval(timer)
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") run()
      }, intervalMs)
    }

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", run)
    window.addEventListener("online", run)
    start()

    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", run)
      window.removeEventListener("online", run)
      window.clearInterval(timer)
    }
  }, [intervalMs])
}
