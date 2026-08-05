'use client'

import Link from 'next/link'
import Image from 'next/image'

/**
 * Shared chrome for the sign-in / sign-up screens.
 *
 * Layout:
 *  - Mobile  : single elegant column — a slim accent motif header strip
 *              above the form card.
 *  - Laptop  : split screen — a decorative art panel (left) beside the form
 *              column (right).
 *
 * Palette matches the mobile side menu (components/layout/header.tsx): black
 * and gray-900 surfaces, gray-800 hairlines, gray-200/400 copy, and rose-600
 * as the single accent — so arriving here from the drawer feels continuous.
 *
 * Everything decorative is pure CSS/SVG (gradients, paisley + mandala motifs),
 * so the screen renders fully even though most product imagery in this project
 * is a 0-byte placeholder. Only the brand logo is a real image asset.
 */

// Paisley (buta) + dotted "mandala" motif, encoded as an inline SVG data URI so
// it can tile as a CSS background without shipping an image file. Stroked in
// rose-500 — the lighter step of the drawer's accent, which holds up against a
// near-black panel where rose-600 would sink into it.
const PAISLEY_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23f43f5e' stroke-width='1.1' opacity='0.5'%3E%3Cpath d='M60 18c16 0 30 12 30 30 0 20-18 28-30 28-9 0-17-6-17-15 0-7 5-12 12-12 5 0 9 3 9 8 0 3-2 6-5 6'/%3E%3Ccircle cx='60' cy='48' r='3' fill='%23f43f5e' stroke='none'/%3E%3C/g%3E%3Cg fill='%23f43f5e' opacity='0.35'%3E%3Ccircle cx='12' cy='12' r='1.6'/%3E%3Ccircle cx='108' cy='108' r='1.6'/%3E%3Ccircle cx='108' cy='12' r='1.6'/%3E%3Ccircle cx='12' cy='108' r='1.6'/%3E%3C/g%3E%3C/svg%3E\")"

// A large, faint concentric mandala used as a watermark on the silk panel.
function Mandala({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="100" cy="100" r="92" strokeWidth="1" />
      <circle cx="100" cy="100" r="74" strokeWidth="0.8" />
      <circle cx="100" cy="100" r="52" strokeWidth="0.8" />
      <circle cx="100" cy="100" r="30" strokeWidth="0.8" />
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i * Math.PI) / 12
        return (
          <line
            key={i}
            x1={100 + 30 * Math.cos(a)}
            y1={100 + 30 * Math.sin(a)}
            x2={100 + 92 * Math.cos(a)}
            y2={100 + 92 * Math.sin(a)}
            strokeWidth="0.6"
          />
        )
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI) / 6
        return (
          <circle
            key={i}
            cx={100 + 63 * Math.cos(a)}
            cy={100 + 63 * Math.sin(a)}
            r="6"
            strokeWidth="0.8"
          />
        )
      })}
    </svg>
  )
}

interface AuthShellProps {
  /** Small kicker above the title, e.g. "Welcome back". */
  eyebrow: string
  /** Main heading, rendered in the serif display face. */
  title: string
  /** Supporting line under the heading. */
  subtitle: string
  /** Poetic line shown on the decorative panel (laptop only). */
  panelQuote: string
  children: React.ReactNode
}

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  panelQuote,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen w-full bg-gray-900 text-gray-200 lg:grid lg:grid-cols-2">
      {/* Decorative art panel (laptop only) */}
      <aside className="relative hidden overflow-hidden border-r border-gray-800 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        {/* Near-black gradient base, the drawer's own surface range */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
        {/* Rose glow blooming from a corner */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-rose-600/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-rose-500/15 blur-3xl" />
        {/* Tiling paisley motif */}
        <div
          className="animate-motif-drift absolute inset-0 opacity-40"
          style={{ backgroundImage: PAISLEY_BG, backgroundSize: '120px 120px' }}
          aria-hidden="true"
        />
        {/* Faint mandala watermark */}
        <Mandala className="absolute -right-16 top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 text-rose-300/15" />
        {/* Diagonal sheen */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-zari-sheen absolute -inset-y-10 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Panel content */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Saakie by KNK — home">
            {/* Black chip, matching the drawer's logo bar — the logo art carries
                its own dark background, so it blends rather than sitting on a
                white card. */}
            <span className="rounded-xl bg-black px-3 py-2 shadow-lg ring-1 ring-gray-800">
              <Image
                src="/images/saakieLogo.png"
                alt="Saakie by KNK"
                width={132}
                height={40}
                className="h-8 w-auto object-contain"
                priority
              />
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="mb-5 h-px w-24 bg-gradient-to-r from-rose-500 to-transparent" />
          <p className="font-serif text-3xl leading-snug text-white xl:text-4xl">
            {panelQuote}
          </p>
          <p className="mt-6 text-sm uppercase tracking-[0.25em] text-rose-300/70">
            Saakie&nbsp;·&nbsp;by&nbsp;KNK
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-gray-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
          Handpicked weaves · Authentic craftsmanship · Across India
        </div>
      </aside>

      {/* Form column */}
      <main className="relative flex min-h-screen flex-col">
        {/* Phone backdrop. On a laptop the atmosphere comes from the art panel
            to the left; below `lg` there is no panel, so the same vocabulary —
            rose bloom over a black-to-gray wash, with the paisley drifting
            behind it — is laid in here rather than leaving the form on flat
            gray. `lg:hidden` keeps the split-screen layout exactly as it was.
            Sits first in the DOM so everything after it paints on top. */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black" />
          {/* Bloom behind the logo and heading, where the eye lands first */}
          <div className="absolute -top-32 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-rose-600/25 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-rose-700/10 blur-3xl" />
          {/* Fainter than the laptop panel's 40% — this one sits directly
              under the form fields, not off to the side. */}
          <div
            className="animate-motif-drift absolute inset-0 opacity-[0.15]"
            style={{ backgroundImage: PAISLEY_BG, backgroundSize: '120px 120px' }}
          />
        </div>

        {/* Mobile-only accent header strip */}
        <div className="relative z-10 h-2 w-full shrink-0 bg-gradient-to-r from-gray-900 via-rose-600 to-gray-900 lg:hidden" />

        <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md animate-slide-up">
            {/* Mobile brand logo. The asset is a 2:1 image with a black
                background baked in, so it is framed in a matching black chip
                with a hairline ring — the same treatment the laptop panel
                gives it — and the width/height below state that true 2:1
                ratio, which every other call site gets wrong. */}
            <div className="mb-8 flex justify-center lg:hidden">
              <Link
                href="/"
                aria-label="Saakie by KNK — home"
                className="overflow-hidden rounded-2xl bg-black p-1.5 shadow-lg shadow-black/50 ring-1 ring-gray-800 transition-shadow hover:shadow-rose-900/30"
              >
                <Image
                  src="/images/saakieLogo.png"
                  alt="Saakie by KNK"
                  width={320}
                  height={160}
                  className="h-20 w-auto rounded-xl object-contain sm:h-24"
                  priority
                />
              </Link>
            </div>

            {/* Heading block */}
            <div className="mb-8 text-center lg:text-left">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-rose-400">
                {eyebrow}
              </p>
              <h1 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 text-sm text-gray-400">{subtitle}</p>
              {/* Accent rule */}
              <div className="mx-auto mt-5 flex items-center justify-center gap-2 lg:mx-0 lg:justify-start">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-rose-500" />
                <span className="text-rose-500" aria-hidden="true">
                  ❖
                </span>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-rose-500" />
              </div>
            </div>

            {children}
          </div>
        </div>

        {/* Footer line */}
        <p className="relative z-10 pb-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Saakie_byknk · Woven with care
        </p>
      </main>
    </div>
  )
}
