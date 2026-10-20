import Link from 'next/link'
import { Instagram } from 'lucide-react'

export const INSTAGRAM_HANDLE = 'saakie_byknk'
export const INSTAGRAM_PROFILE_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`

/**
 * A slim band directly above the footer inviting visitors to follow the
 * store on Instagram. Server component: no state, one outbound link.
 */
export function InstagramCta() {
  return (
    <section
      aria-labelledby="instagram-cta-heading"
      className="border-t border-gray-100 bg-[#fdf8f0]"
    >
      <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-10 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Instagram size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 id="instagram-cta-heading" className="text-lg font-medium uppercase tracking-[0.18em] text-gray-900">
              Follow us on Instagram
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              New weaves, styling ideas and behind-the-loom moments at @{INSTAGRAM_HANDLE}
            </p>
          </div>
        </div>
        <Link
          href={INSTAGRAM_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-primary-700"
        >
          <Instagram size={18} aria-hidden="true" />
          Follow @{INSTAGRAM_HANDLE}
        </Link>
      </div>
    </section>
  )
}
