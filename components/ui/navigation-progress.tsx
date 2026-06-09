'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * NavigationProgress — a YouTube/GitHub-style sliver bar that pins to the top of
 * the viewport the instant a user clicks an in-app link, and completes once the
 * new route has painted.
 *
 * Why this exists: Next.js App Router keeps the *current* page fully visible
 * while it streams the next route's server data. With no feedback, a click reads
 * as "frozen" for a second or two. This bar makes navigation feel instant even
 * when the network isn't.
 *
 * How it works:
 *  - We can't hook Next's router transition directly in a stable way, so we
 *    listen for clicks on anchor (<a>) elements that point at same-origin routes
 *    and start the bar immediately on click (zero perceived latency).
 *  - When `pathname` / `searchParams` actually change, the route has committed,
 *    so we snap the bar to 100% and fade it out.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // `progress` is 0–100; `visible` controls mount/fade of the bar.
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  // Timers we need to clear so a fast second navigation doesn't fight the first.
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const doneRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = () => {
    if (trickleRef.current) clearInterval(trickleRef.current)
    if (doneRef.current) clearTimeout(doneRef.current)
    trickleRef.current = null
    doneRef.current = null
  }

  // Kick the bar off and let it "trickle" toward ~85% — it never reaches 100%
  // on its own; the route change (effect below) is what finishes it.
  const start = () => {
    clearTimers()
    setVisible(true)
    setProgress(12)
    trickleRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) return p
        // Decelerate as we climb so it feels like real loading, not a metronome.
        const remaining = 85 - p
        return p + Math.max(1, remaining * 0.12)
      })
    }, 220)
  }

  // Finish: snap to 100%, then fade out and reset.
  const done = () => {
    clearTimers()
    setProgress(100)
    doneRef.current = setTimeout(() => {
      setVisible(false)
      // Reset to 0 only after the fade-out has played (300ms transition below).
      setTimeout(() => setProgress(0), 300)
    }, 250)
  }

  // Intercept same-origin link clicks to start the bar at click time.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Respect modified clicks (new tab/window) and non-primary buttons.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return
      }
      const anchor = (e.target as HTMLElement)?.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      const target = anchor.getAttribute('target')
      if (!href || target === '_blank' || anchor.hasAttribute('download')) return

      // Only same-origin, real navigations. Skip hash-only and external links.
      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      const samePage = url.pathname === window.location.pathname && url.search === window.location.search
      if (samePage) return // hash jump or no-op — don't flash the bar

      start()
    }

    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
    // start/done are stable for our purposes; we intentionally bind once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When the route actually changes, the navigation has committed — finish.
  useEffect(() => {
    if (!visible) return
    done()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  // Clean up on unmount.
  useEffect(() => () => clearTimers(), [])

  if (!visible && progress === 0) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
    >
      <div
        className="h-full bg-gradient-to-r from-maroon-600 via-primary-600 to-marigold-400 shadow-[0_0_8px_rgba(0,0,0,0.25)] transition-[width,opacity] duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  )
}
