'use client'

import { usePathname } from 'next/navigation'

/**
 * Routes that show the site footer. Everywhere else renders without one.
 *
 * Prefix-matched the same way `PUBLIC_PAGES` is in middleware.ts, so a nested
 * route inherits its parent's answer — `/blog/some-post` and
 * `/account/orders/abc123` get the footer because `/blog` and `/account` do.
 */
const FOOTER_PAGES = [
  '/account',
  '/about',
  '/our-story',
  '/blog',
  '/contact',
]

function showsFooter(pathname: string): boolean {
  return FOOTER_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  )
}

/**
 * Renders its children only on the routes listed above.
 *
 * The footer used to be pasted into each page's JSX — 37 copies across 22
 * files, which is why `/account` managed to render two of them. Gating it once
 * here means a new page opts in by route rather than by remembering to import
 * anything.
 *
 * Takes the footer as `children` rather than importing it, so the footer itself
 * stays a server component and never enters the client bundle.
 */
export function SiteFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return showsFooter(pathname) ? <>{children}</> : null
}
