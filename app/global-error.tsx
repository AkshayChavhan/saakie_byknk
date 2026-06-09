'use client'

import { useEffect } from 'react'

/**
 * Last-resort error boundary that catches errors thrown by the root layout
 * itself. Unlike error.tsx, it REPLACES the root layout, so per Next.js it must
 * render its own <html> and <body>. It cannot depend on the app's fonts or
 * Providers (those live in the layout it's replacing), so it stays
 * self-contained: plain Tailwind utilities and a plain <a> for navigation.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-8">
              A critical error occurred. Please refresh the page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => reset()}
                className="inline-flex items-center justify-center px-8 py-3 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-all"
              >
                Try again
              </button>
              {/* Plain anchor (not next/link): global-error replaces the root
                  layout, so a hard navigation is the safe, intended behavior
                  here — it fully re-mounts the app from a clean state. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-900 font-medium rounded-full border border-gray-200 hover:bg-rose-50 transition-all"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
