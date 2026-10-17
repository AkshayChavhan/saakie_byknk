/**
 * Decisions the service worker (app/sw.ts) makes about what it may cache.
 * Kept as plain functions so they can be unit-tested; the worker itself
 * cannot be imported in tests.
 */

/**
 * Hosts whose responses carry session or payment state and must never be
 * served from a cache: Clerk's frontend API (session, environment) and the
 * Razorpay checkout. Serwist's default cross-origin rule would otherwise
 * keep them for an hour.
 */
export function isSessionOrPaymentHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return (
    h === 'clerk.com' ||
    h.endsWith('.clerk.com') ||
    h.endsWith('.clerk.accounts.dev') ||
    h.endsWith('.clerk.services') ||
    h.endsWith('razorpay.com') ||
    h.endsWith('stripe.com')
  )
}

/** Page paths whose HTML is personal and must always come from the network. */
const PRIVATE_PATH_PREFIXES = [
  '/account',
  '/admin',
  '/cart',
  '/checkout',
  '/wishlist',
  '/sign-in',
  '/sign-up',
]

export function isPrivateNavigation(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Caches holding per-visitor pages, dropped on sign-out. */
export const PRIVATE_CACHE_NAMES = ['pages']
