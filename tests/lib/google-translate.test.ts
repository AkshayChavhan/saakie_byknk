import { describe, it, expect, beforeEach } from 'vitest'
import {
  GT_SUPPORTED,
  activeGoogleLanguage,
  applyGoogleLanguage,
} from '@/lib/google-translate'

const clearCookie = () => {
  document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

describe('google-translate cookie helpers', () => {
  beforeEach(clearCookie)

  it('reports English when no cookie is set', () => {
    expect(activeGoogleLanguage()).toBe('en')
  })

  it('round-trips a supported language', () => {
    applyGoogleLanguage('hi')
    expect(document.cookie).toContain('googtrans=/en/hi')
    expect(activeGoogleLanguage()).toBe('hi')
  })

  it('clears the cookie when English is applied', () => {
    applyGoogleLanguage('mr')
    expect(activeGoogleLanguage()).toBe('mr')
    applyGoogleLanguage('en')
    expect(activeGoogleLanguage()).toBe('en')
  })

  it('ignores unknown codes rather than writing garbage', () => {
    applyGoogleLanguage('hi')
    applyGoogleLanguage('xx')
    expect(activeGoogleLanguage()).toBe('hi')
  })

  it('reads the URL-encoded cookie form Google sometimes leaves behind', () => {
    document.cookie = 'googtrans=%2Fen%2Fta; path=/'
    expect(activeGoogleLanguage()).toBe('ta')
  })

  it('treats a cookie pointing at an unsupported target as off', () => {
    document.cookie = 'googtrans=/en/zz; path=/'
    expect(activeGoogleLanguage()).toBe('en')
  })

  it('covers every picker language except English', () => {
    // lib/language.ts lists 11 languages; all but 'en' must be translatable.
    expect(GT_SUPPORTED).toHaveLength(10)
    expect(GT_SUPPORTED).not.toContain('en')
  })
})
