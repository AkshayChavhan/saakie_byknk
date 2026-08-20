'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LANGUAGES, getLanguage, setLanguage } from '@/lib/language'
import { applyGoogleLanguage } from '@/lib/google-translate'

/**
 * Simplified landmark silhouettes, one per language — the visual anchor of
 * each card, the way regional language pickers do it (Taj Mahal for Hindi,
 * a gopuram for Tamil, and so on). Drawn in currentColor so the card tints
 * them: gray at rest, blue when selected.
 */
function Landmark({ code, className }: { code: string; className?: string }) {
  const art: Record<string, React.ReactNode> = {
    // Tower Bridge — two turreted towers and the lifting span.
    en: (
      <>
        <path d="M14 10 L18 2 L22 10 V34 H6 V10 L10 2 L14 10 Z" transform="translate(8 8)" />
        <path d="M14 10 L18 2 L22 10 V34 H6 V10 L10 2 L14 10 Z" transform="translate(62 8)" />
        <rect x="20" y="26" width="56" height="4" />
        <path d="M22 26 Q48 12 74 26 L74 22 Q48 8 22 22 Z" opacity=".6" />
      </>
    ),
    // Taj Mahal — central dome, plinth, flanking minarets.
    hi: (
      <>
        <rect x="4" y="16" width="4" height="26" />
        <rect x="88" y="16" width="4" height="26" />
        <path d="M48 6 Q62 16 62 26 H34 Q34 16 48 6 Z" />
        <rect x="26" y="26" width="44" height="16" />
        <path d="M30 26 v-6 h6 v6 Z M60 26 v-6 h6 v6 Z" />
      </>
    ),
    // Gateway of India — broad arch with corner turrets.
    mr: (
      <>
        <rect x="14" y="10" width="68" height="32" />
        <path d="M34 42 V30 Q34 18 48 18 Q62 18 62 30 V42 Z" fill="#fff" opacity=".9" />
        <rect x="10" y="6" width="8" height="36" />
        <rect x="78" y="6" width="8" height="36" />
      </>
    ),
    // Gopuram — stepped temple tower.
    ta: (
      <>
        <path d="M40 4 H56 L60 12 H36 Z" />
        <path d="M34 12 H62 L66 22 H30 Z" />
        <path d="M28 22 H68 L72 32 H24 Z" />
        <rect x="20" y="32" width="56" height="10" />
      </>
    ),
    // Charminar — four minarets over the arched base.
    te: (
      <>
        <rect x="18" y="4" width="8" height="38" rx="3" />
        <rect x="70" y="4" width="8" height="38" rx="3" />
        <rect x="26" y="16" width="44" height="26" />
        <path d="M38 42 V32 Q38 26 48 26 Q58 26 58 32 V42 Z" fill="#fff" opacity=".9" />
      </>
    ),
    // Vidhana Soudha — central dome over a colonnade.
    kn: (
      <>
        <path d="M48 4 Q58 10 58 18 H38 Q38 10 48 4 Z" />
        <rect x="16" y="18" width="64" height="6" />
        <path d="M20 24 h6 v18 h-6 Z M34 24 h6 v18 h-6 Z M48 24 h6 v18 h-6 Z M62 24 h6 v18 h-6 Z M76 24 h4 v18 h-4 Z" />
      </>
    ),
    // Howrah Bridge — cantilever truss over the river.
    bn: (
      <>
        <path d="M8 34 Q48 6 88 34 L88 30 Q48 2 8 30 Z" />
        <rect x="8" y="34" width="80" height="3" />
        <path d="M20 34 V22 M36 34 V14 M60 34 V14 M76 34 V22" stroke="currentColor" strokeWidth="3" fill="none" />
        <path d="M6 42 q6 -3 12 0 q6 3 12 0 q6 -3 12 0 q6 3 12 0 q6 -3 12 0 q6 3 12 0 q6 -3 12 0" stroke="currentColor" strokeWidth="2" fill="none" opacity=".5" />
      </>
    ),
    // Statue of Unity — figure on its plinth.
    gu: (
      <>
        <circle cx="48" cy="8" r="5" />
        <path d="M42 14 H54 L58 34 H52 L52 20 H44 L44 34 H38 Z" />
        <rect x="34" y="34" width="28" height="8" />
      </>
    ),
    // Jagannath Temple — three curved shikharas.
    or: (
      <>
        <path d="M48 2 Q60 14 58 42 H38 Q36 14 48 2 Z" />
        <path d="M26 16 Q34 24 33 42 H19 Q18 24 26 16 Z" opacity=".7" />
        <path d="M70 16 Q78 24 77 42 H63 Q62 24 70 16 Z" opacity=".7" />
      </>
    ),
    // Kerala houseboat on the backwaters.
    ml: (
      <>
        <path d="M28 12 Q48 2 68 12 V26 H28 Z" />
        <path d="M14 26 H82 L74 36 H22 Z" />
        <path d="M10 42 q6 -3 12 0 q6 3 12 0 q6 -3 12 0 q6 3 12 0 q6 -3 12 0 q6 3 12 0" stroke="currentColor" strokeWidth="2" fill="none" opacity=".5" />
      </>
    ),
    // Golden Temple — dome over the sarovar.
    pa: (
      <>
        <path d="M48 4 Q56 10 56 16 H40 Q40 10 48 4 Z" />
        <rect x="34" y="16" width="28" height="18" />
        <rect x="26" y="24" width="8" height="10" />
        <rect x="62" y="24" width="8" height="10" />
        <path d="M14 40 q6 -3 12 0 q6 3 12 0 q6 -3 12 0 q6 3 12 0 q6 -3 12 0" stroke="currentColor" strokeWidth="2" fill="none" opacity=".5" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 96 48" className={className} fill="currentColor" aria-hidden="true">
      {art[code] ?? art.en}
    </svg>
  )
}

/**
 * Full-screen language chooser, reached from My Account. Radio-style cards —
 * native script large, English name on a pill, landmark art on the right —
 * with the selection saved on Continue. Purely a stored preference for now:
 * the storefront copy itself is not translated yet.
 */
export default function ChooseLanguagePage() {
  const [selected, setSelected] = useState('en')

  // localStorage exists only in the browser, so read after mount.
  useEffect(() => {
    setSelected(getLanguage().code)
  }, [])

  const save = () => {
    setLanguage(selected)
    // Point Google website-translate at the choice (or switch it off for
    // English), then hard-navigate: the widget reads its cookie on page
    // load, so a full reload is what makes the whole site flip languages.
    applyGoogleLanguage(selected)
    window.location.assign('/account')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-blue-600 pt-safe">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link href="/account" aria-label="Back to account" className="text-white">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-xl font-bold text-white">Choose Language</h1>
        </div>
      </header>

      {/* Language cards — bottom padding clears the sticky Continue bar. */}
      <main className="mx-auto max-w-xl space-y-3 px-4 py-4 pb-28">
        {LANGUAGES.map((lang) => {
          const isSelected = lang.code === selected
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setSelected(lang.code)}
              aria-pressed={isSelected}
              className={cn(
                'flex w-full items-center gap-4 rounded-2xl border bg-white p-5 text-left transition-colors',
                isSelected
                  ? 'border-2 border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              {/* Radio */}
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  isSelected ? 'bg-blue-600' : 'border-2 border-gray-300'
                )}
              >
                {isSelected && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
              </span>

              {/* Names */}
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                <span className="text-2xl font-semibold text-gray-900">{lang.native}</span>
                <span className="rounded-md bg-gray-700 px-2 py-0.5 text-sm text-white">
                  {lang.english}
                </span>
              </span>

              <Landmark
                code={lang.code}
                className={cn('h-14 w-28 shrink-0', isSelected ? 'text-blue-500' : 'text-gray-300')}
              />
            </button>
          )
        })}
      </main>

      {/* Continue */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white p-4 pb-safe">
        <button
          type="button"
          onClick={save}
          className="mx-auto block w-full max-w-xl rounded-xl bg-blue-600 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-blue-700 active:scale-[0.99]"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
