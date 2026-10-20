/**
 * Hero slides come in two sets: one made for laptops, one for phones. These
 * constants are shared by the admin form, the admin API validation, the
 * server-side device pick and the storefront hero, so the two sides agree on
 * the names and on where "mobile" ends.
 */

export const HERO_SLIDE_DEVICES = ['DESKTOP', 'MOBILE'] as const
export type HeroSlideDevice = (typeof HERO_SLIDE_DEVICES)[number]

export const DEFAULT_HERO_SLIDE_DEVICE: HeroSlideDevice = 'DESKTOP'

/**
 * Screens at least this wide get the DESKTOP set. It is Tailwind's `lg`
 * breakpoint, the point where the storefront switches to its wide layout.
 */
export const DESKTOP_MIN_WIDTH_PX = 1024

/** The media query the storefront uses to confirm the server's guess. */
export const DESKTOP_MEDIA_QUERY = `(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`

export const HERO_SLIDE_DEVICE_LABEL: Record<HeroSlideDevice, string> = {
  DESKTOP: 'Laptop / Desktop',
  MOBILE: 'Mobile / Tablet',
}

/** Hint shown under the upload box so the admin picks a photo of the right shape. */
export const HERO_SLIDE_DEVICE_HINT: Record<HeroSlideDevice, string> = {
  DESKTOP: 'Wide image works best (about 1920 × 800)',
  MOBILE: 'Tall image works best (about 1080 × 1350)',
}

/** The set a slide belongs to, treating anything unknown as DESKTOP. */
export function parseHeroSlideDevice(value: unknown): HeroSlideDevice | null {
  if (typeof value !== 'string') return null
  const upper = value.trim().toUpperCase()
  return (HERO_SLIDE_DEVICES as readonly string[]).includes(upper) ? (upper as HeroSlideDevice) : null
}

export function otherHeroSlideDevice(device: HeroSlideDevice): HeroSlideDevice {
  return device === 'DESKTOP' ? 'MOBILE' : 'DESKTOP'
}
