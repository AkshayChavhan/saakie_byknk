import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Offline — Saakie_byknk',
}

// Served by the service worker (app/sw.ts) as the navigation fallback when the
// network is unreachable and the requested page is not cached. It must be a
// PUBLIC page (see middleware.ts PUBLIC_PAGES) — a signed-out visitor can hit it
// offline, and redirecting to /sign-in would itself require the network.
// Deliberately self-contained: no Header/Footer (those make session/API calls).
export default function OfflinePage() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9 9a5 5 0 016 6m-9.5-2.5A9 9 0 0112 8m6.5 1.5A9 9 0 0119 12" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">You&apos;re offline</h1>
      <p className="mt-3 max-w-sm text-sm font-light leading-relaxed text-gray-600">
        We can&apos;t reach the network right now. Please check your connection.
        Pages you&apos;ve already viewed may still be available.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Try again
      </Link>
    </main>
  )
}
