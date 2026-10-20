import 'server-only'
import { headers } from 'next/headers'
import type { HeroSlideDevice } from '@/lib/hero-slide-device'

/**
 * Best guess at the visitor's device class from request headers, used to
 * serve the right hero slide set in the first HTML (no flash, no second
 * image download). The storefront re-checks against the real viewport after
 * hydration, so a wrong guess costs one swap, never a blank hero.
 *
 * `sec-ch-ua-mobile` is the reliable signal where browsers send it
 * (Chromium); the user-agent string covers the rest. iPads report a desktop
 * user agent since iPadOS 13 and get the DESKTOP set, which suits their
 * landscape-friendly width.
 */
export function deviceFromHeaders(input: {
  chMobile?: string | null
  userAgent?: string | null
}): HeroSlideDevice {
  if (input.chMobile === '?1') return 'MOBILE'
  if (input.chMobile === '?0') return 'DESKTOP'
  const ua = input.userAgent ?? ''
  return /Mobi|Android|iPhone|iPod|Windows Phone|Opera Mini/i.test(ua) ? 'MOBILE' : 'DESKTOP'
}

/** The device class of the current request (server components / route handlers). */
export async function requestDevice(): Promise<HeroSlideDevice> {
  const h = await headers()
  return deviceFromHeaders({
    chMobile: h.get('sec-ch-ua-mobile'),
    userAgent: h.get('user-agent'),
  })
}
