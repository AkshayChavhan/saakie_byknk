/**
 * Phone-number helpers shared by forms (client) and the APIs that persist
 * them (server). Pure string work — safe to import anywhere.
 *
 * Numbers are stored as one string, "+<dial> <national>" (e.g.
 * "+91 9876543210"). Legacy rows hold bare digits; `splitPhone` reads those
 * as Indian numbers, so nothing breaks and every edit-save upgrades the row
 * to the explicit form. India is the default country throughout.
 */

export interface PhoneCountry {
  /** ISO 3166-1 alpha-2, used as the option key. */
  iso: string
  name: string
  /** Dial code without the plus sign. */
  dial: string
  /** Exact national-number lengths accepted for this country. */
  lengths: number[]
}

/**
 * India first — it is the default. The rest cover the diaspora markets a
 * saree store actually ships to; anything rarer can be added when asked for.
 */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'IN', name: 'India', dial: '91', lengths: [10] },
  { iso: 'AE', name: 'UAE', dial: '971', lengths: [9] },
  { iso: 'US', name: 'USA', dial: '1', lengths: [10] },
  { iso: 'GB', name: 'UK', dial: '44', lengths: [10] },
  { iso: 'CA', name: 'Canada', dial: '1', lengths: [10] },
  { iso: 'AU', name: 'Australia', dial: '61', lengths: [9] },
  { iso: 'SG', name: 'Singapore', dial: '65', lengths: [8] },
  { iso: 'MY', name: 'Malaysia', dial: '60', lengths: [9, 10] },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966', lengths: [9] },
  { iso: 'QA', name: 'Qatar', dial: '974', lengths: [8] },
  { iso: 'KW', name: 'Kuwait', dial: '965', lengths: [8] },
  { iso: 'OM', name: 'Oman', dial: '968', lengths: [8] },
  { iso: 'BH', name: 'Bahrain', dial: '973', lengths: [8] },
  { iso: 'NP', name: 'Nepal', dial: '977', lengths: [10] },
  { iso: 'LK', name: 'Sri Lanka', dial: '94', lengths: [9] },
  { iso: 'BD', name: 'Bangladesh', dial: '880', lengths: [10] },
  { iso: 'NZ', name: 'New Zealand', dial: '64', lengths: [8, 9, 10] },
  { iso: 'DE', name: 'Germany', dial: '49', lengths: [10, 11] },
]

export const DEFAULT_COUNTRY = PHONE_COUNTRIES[0] // India

const byIso = new Map(PHONE_COUNTRIES.map((c) => [c.iso, c]))

export function getCountry(iso: string): PhoneCountry {
  return byIso.get(iso) ?? DEFAULT_COUNTRY
}

/** Strip everything but digits — spaces, dashes, brackets, dots. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Whether `national` is a plausible subscriber number for the country.
 * India gets the real mobile rule (10 digits, first digit 6–9); everywhere
 * else validates by the country's known national-number lengths.
 */
export function isValidNationalNumber(country: PhoneCountry, national: string): boolean {
  const digits = digitsOnly(national)
  if (country.iso === 'IN') return /^[6-9]\d{9}$/.test(digits)
  return country.lengths.includes(digits.length)
}

/** Canonical stored form: "+<dial> <national digits>". */
export function formatPhone(country: PhoneCountry, national: string): string {
  return `+${country.dial} ${digitsOnly(national)}`
}

/**
 * Parse a stored value back into country + national number.
 *
 * Accepts the canonical "+<dial> <digits>" form, "+<dial><digits>" without
 * the space (longest dial code wins), and legacy bare digits — the latter
 * read as India, optionally allowing a leading 0 or 91 prefix the way
 * numbers are colloquially written here.
 */
export function splitPhone(stored: string | null | undefined): {
  country: PhoneCountry
  national: string
} {
  const value = (stored ?? '').trim()
  if (!value) return { country: DEFAULT_COUNTRY, national: '' }

  if (value.startsWith('+')) {
    const digits = digitsOnly(value)
    // Longest dial code first so +971… never matches +91.
    const match = [...PHONE_COUNTRIES]
      .sort((a, b) => b.dial.length - a.dial.length)
      .find((c) => digits.startsWith(c.dial))
    if (match) return { country: match, national: digits.slice(match.dial.length) }
    return { country: DEFAULT_COUNTRY, national: digits }
  }

  // Legacy bare number — treat as Indian, tolerating "0…" and "91…" prefixes.
  let digits = digitsOnly(value)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  return { country: DEFAULT_COUNTRY, national: digits }
}

/**
 * Validate a stored/submitted phone string as a whole. Empty is acceptable —
 * "no phone on file" is a legal state; require it at the call site instead.
 */
export function isValidPhone(stored: string | null | undefined): boolean {
  const value = (stored ?? '').trim()
  if (!value) return true
  const { country, national } = splitPhone(value)
  return isValidNationalNumber(country, national)
}
