/**
 * Display-language preference for the storefront.
 *
 * The site's copy is not translated yet — this records the shopper's choice
 * (picked on /account/language) so the UI can greet it today and an i18n
 * layer can consume it later. Stored client-side in localStorage; there is
 * deliberately no server field until translations actually exist.
 */

export interface Language {
  /** BCP-47 primary subtag. */
  code: string
  /** Name in its own script — the large label on the chooser. */
  native: string
  /** English name — the small pill under it. */
  english: string
}

/** English first as the default; the rest ordered as on the chooser. */
export const LANGUAGES: Language[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'hi', native: 'हिंदी', english: 'Hindi' },
  { code: 'mr', native: 'मराठी', english: 'Marathi' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'or', native: 'ଓଡ଼ିଆ', english: 'Odia' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
]

export const DEFAULT_LANGUAGE = LANGUAGES[0] // English

const STORAGE_KEY = 'saakie.language'

export function getLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  try {
    const code = window.localStorage.getItem(STORAGE_KEY)
    return LANGUAGES.find((l) => l.code === code) ?? DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

export function setLanguage(code: string): void {
  if (typeof window === 'undefined') return
  if (!LANGUAGES.some((l) => l.code === code)) return
  try {
    window.localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // Storage full or blocked (private mode) — the choice just doesn't stick.
  }
}
