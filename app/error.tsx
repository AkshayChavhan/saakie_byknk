'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'

/**
 * Route-level error boundary for the storefront. Catches render/data errors in
 * any segment under the root layout and shows a branded recovery screen instead
 * of Next's default. Renders inside the root layout, so it inherits fonts,
 * Providers, and the nav progress bar.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface the error for logging/observability.
    console.error('Route error boundary caught:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-8">
            We hit a snag loading this page. Please try again.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center px-8 py-3 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-all hover:shadow-lg active:scale-[0.98]"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-900 font-medium rounded-full border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-all"
            >
              Back to Home
            </Link>
          </div>
          {error.digest && (
            <p className="mt-6 text-xs text-gray-400">Error reference: {error.digest}</p>
          )}
        </div>
      </div>
    </div>
  )
}
