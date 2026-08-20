'use client'

import Link from 'next/link'
import { Construction, ArrowLeft, Home } from 'lucide-react'
import { Header } from '@/components/layout/header'

interface UnderDevelopmentProps {
  /** Page title, e.g. "Privacy Policy". */
  title: string
  /** Optional one-line description of what's coming. */
  description?: string
}

/**
 * Saree-themed "page under development" placeholder. Used by the legal /
 * informational routes (Privacy Policy, Terms of Service, Disclaimer) until
 * their real content is written. Keeps the site header and footer so
 * navigation still works.
 */
export function UnderDevelopment({ title, description }: UnderDevelopmentProps) {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-gradient-to-b from-[#fdf8f0] to-white px-5 py-20">
        {/* Soft saree-tone glows */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-marigold-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-maroon-200/40 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-xl text-center">
          {/* Icon badge */}
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon-700 to-maroon-600 shadow-lg shadow-maroon-900/20 ring-1 ring-marigold-200/40">
            <Construction className="h-10 w-10 text-marigold-100" aria-hidden="true" />
          </div>

          {/* Zari rule */}
          <div className="mx-auto mb-5 flex items-center justify-center gap-2">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-zari" />
            <span className="text-zari" aria-hidden="true">❖</span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-zari" />
          </div>

          <p className="text-xs font-medium uppercase tracking-[0.3em] text-marigold-600">
            Coming soon
          </p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-maroon-800 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-maroon-700/70">
            {description ??
              'This page is currently under development. We are weaving it together with care and it will be available shortly. Thank you for your patience.'}
          </p>

          {/* Actions */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-maroon-700 to-maroon-600 px-6 py-3 text-sm font-semibold text-marigold-50 shadow-lg shadow-maroon-900/20 transition-all duration-200 hover:from-maroon-800 hover:to-maroon-700 hover:shadow-xl active:scale-[0.99] sm:w-auto"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
            <Link
              href="/products"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-maroon-200 bg-white px-6 py-3 text-sm font-semibold text-maroon-700 transition-colors hover:bg-maroon-50 sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>

    </div>
  )
}
