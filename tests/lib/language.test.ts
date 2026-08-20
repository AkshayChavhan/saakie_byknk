import { describe, it, expect, beforeEach } from 'vitest'
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage, setLanguage } from '@/lib/language'

describe('language preference', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to English', () => {
    expect(DEFAULT_LANGUAGE.code).toBe('en')
    expect(getLanguage().code).toBe('en')
  })

  it('round-trips a chosen language', () => {
    setLanguage('hi')
    expect(getLanguage().english).toBe('Hindi')
  })

  it('ignores unknown codes rather than storing garbage', () => {
    setLanguage('hi')
    setLanguage('xx')
    expect(getLanguage().code).toBe('hi')
  })

  it('falls back to English when storage holds a stale code', () => {
    window.localStorage.setItem('saakie.language', 'zz')
    expect(getLanguage().code).toBe('en')
  })

  it('lists every language with native and English names', () => {
    for (const lang of LANGUAGES) {
      expect(lang.code).toBeTruthy()
      expect(lang.native).toBeTruthy()
      expect(lang.english).toBeTruthy()
    }
    // No duplicate codes — the picker keys on them.
    expect(new Set(LANGUAGES.map((l) => l.code)).size).toBe(LANGUAGES.length)
  })
})
