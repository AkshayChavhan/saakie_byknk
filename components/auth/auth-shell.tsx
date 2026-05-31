'use client'

import Link from 'next/link'
import Image from 'next/image'

/**
 * Shared chrome for the sign-in / sign-up screens.
 *
 * Layout:
 *  - Mobile  : single elegant column — a slim zari-gold motif header strip
 *              above the form card, all on a warm ivory backdrop.
 *  - Laptop  : split screen — a decorative Banarasi-silk art panel (left)
 *              beside the form column (right).
 *
 * Everything decorative is pure CSS/SVG (silk gradients, paisley + mandala
 * motifs, zari-thread borders), so the screen renders fully even though most
 * product imagery in this project is a 0-byte placeholder. Only the brand
 * logo is a real image asset.
 */

// Paisley (buta) + dotted "mandala" motif, encoded as an inline SVG data URI so
// it can tile as a CSS background without shipping an image file.
const PAISLEY_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23e6c757' stroke-width='1.1' opacity='0.5'%3E%3Cpath d='M60 18c16 0 30 12 30 30 0 20-18 28-30 28-9 0-17-6-17-15 0-7 5-12 12-12 5 0 9 3 9 8 0 3-2 6-5 6'/%3E%3Ccircle cx='60' cy='48' r='3' fill='%23e6c757' stroke='none'/%3E%3C/g%3E%3Cg fill='%23e6c757' opacity='0.35'%3E%3Ccircle cx='12' cy='12' r='1.6'/%3E%3Ccircle cx='108' cy='108' r='1.6'/%3E%3Ccircle cx='108' cy='12' r='1.6'/%3E%3Ccircle cx='12' cy='108' r='1.6'/%3E%3C/g%3E%3C/svg%3E\")"

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
    <div className="min-h-screen w-full bg-[#fdf8f0] text-maroon-900 lg:grid lg:grid-cols-2">
      {/* Decorative silk art panel (laptop only) */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        {/* Banarasi silk gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-maroon-800 via-maroon-700 to-[#3a0f14]" />
        {/* Marigold glow blooming from a corner */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-marigold-400/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-maroon-500/30 blur-3xl" />
        {/* Tiling paisley motif */}
        <div
          className="animate-motif-drift absolute inset-0 opacity-60"
          style={{ backgroundImage: PAISLEY_BG, backgroundSize: '120px 120px' }}
          aria-hidden="true"
        />
        {/* Faint mandala watermark */}
        <Mandala className="absolute -right-16 top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 text-marigold-200/20" />
        {/* Diagonal gold sheen */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-zari-sheen absolute -inset-y-10 left-0 w-1/3 bg-gradient-to-r from-transparent via-marigold-200/15 to-transparent" />
        </div>

        {/* Panel content */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Saakie by KNK — home">
            <span className="rounded-xl bg-white/95 px-3 py-2 shadow-lg ring-1 ring-marigold-200/40">
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
          <div className="mb-5 h-px w-24 bg-gradient-to-r from-marigold-300 to-transparent" />
          <p className="font-serif text-3xl leading-snug text-[#fdf0d8] xl:text-4xl">
            {panelQuote}
          </p>
          <p className="mt-6 text-sm uppercase tracking-[0.25em] text-marigold-200/70">
            Saakie&nbsp;·&nbsp;by&nbsp;KNK
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-marigold-100/60">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-marigold-300" />
          Handpicked weaves · Authentic craftsmanship · Across India
        </div>
      </aside>

      {/* Form column */}
      <main className="relative flex min-h-screen flex-col">
        {/* Mobile-only zari motif header strip */}
        <div className="relative h-2 w-full shrink-0 bg-gradient-to-r from-maroon-700 via-marigold-400 to-maroon-700 lg:hidden" />

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md animate-slide-up">
            {/* Mobile brand logo */}
            <div className="mb-8 flex justify-center lg:hidden">
              <Link href="/" aria-label="Saakie by KNK — home">
                <Image
                  src="/images/saakieLogo.png"
                  alt="Saakie by KNK"
                  width={150}
                  height={46}
                  className="h-11 w-auto object-contain"
                  priority
                />
              </Link>
            </div>

            {/* Heading block */}
            <div className="mb-8 text-center lg:text-left">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-marigold-600">
                {eyebrow}
              </p>
              <h1 className="mt-3 font-serif text-3xl font-bold text-maroon-800 sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 text-sm text-maroon-700/70">{subtitle}</p>
              {/* Zari rule */}
              <div className="mx-auto mt-5 flex items-center justify-center gap-2 lg:mx-0 lg:justify-start">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-zari" />
                <span className="text-zari" aria-hidden="true">
                  ❖
                </span>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-zari" />
              </div>
            </div>

            {children}
          </div>
        </div>

        {/* Footer line */}
        <p className="pb-6 text-center text-xs text-maroon-700/50">
          © {new Date().getFullYear()} Saakie_byknk · Woven with care
        </p>
      </main>
    </div>
  )
}
