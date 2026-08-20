/**
 * Google website-translate plumbing for the language picker.
 *
 * Google's legacy page-translation widget reads a `googtrans` cookie shaped
 * `/en/<target>` and translates the whole DOM — UI chrome and database text
 * alike — on every page while the cookie is set. The picker writes the cookie
 * here and reloads; components/i18n/google-translate-loader.tsx boots the
 * widget only when a target language is active, so English visitors never
 * load Google's script at all.
 */

/** Our picker codes that Google's widget accepts, 1:1. `en` means "off". */
export const GT_SUPPORTED = [
  'hi',
  'mr',
  'ta',
  'te',
  'kn',
  'bn',
  'gu',
  'or',
  'ml',
  'pa',
] as const

const COOKIE = 'googtrans'

/** The translate target currently active via cookie, or 'en' for none. */
export function activeGoogleLanguage(): string {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
  if (!match) return 'en'
  // Value looks like "/en/hi" (sometimes URL-encoded as "%2Fen%2Fhi").
  const value = decodeURIComponent(match.slice(COOKIE.length + 1))
  const target = value.split('/')[2]
  return (GT_SUPPORTED as readonly string[]).includes(target) ? target : 'en'
}

/**
 * Point the widget at `code`, or switch it off for 'en'. Unknown codes are
 * ignored. The cookie is written for both the bare host and `.host` because
 * Google reads either depending on how the page was reached.
 */
export function applyGoogleLanguage(code: string): void {
  if (typeof document === 'undefined') return

  const host = window.location.hostname
  const domains = ['', host, `.${host}`]

  if (code === 'en') {
    for (const domain of domains) {
      document.cookie = `${COOKIE}=; path=/;${domain ? ` domain=${domain};` : ''} expires=Thu, 01 Jan 1970 00:00:00 GMT`
    }
    return
  }

  if (!(GT_SUPPORTED as readonly string[]).includes(code)) return

  const value = `/en/${code}`
  for (const domain of domains) {
    document.cookie = `${COOKIE}=${value}; path=/;${domain ? ` domain=${domain};` : ''} max-age=31536000`
  }
}
