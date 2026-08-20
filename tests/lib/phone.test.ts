import { describe, it, expect } from 'vitest'
import {
  PHONE_COUNTRIES,
  DEFAULT_COUNTRY,
  getCountry,
  splitPhone,
  formatPhone,
  isValidNationalNumber,
  isValidPhone,
} from '@/lib/phone'

describe('phone helpers', () => {
  it('defaults to India', () => {
    expect(DEFAULT_COUNTRY.iso).toBe('IN')
    expect(DEFAULT_COUNTRY.dial).toBe('91')
    expect(PHONE_COUNTRIES[0].iso).toBe('IN')
  })

  it('falls back to India for unknown country codes', () => {
    expect(getCountry('XX').iso).toBe('IN')
  })

  describe('Indian mobile validation', () => {
    const india = getCountry('IN')

    it('accepts 10 digits starting 6-9', () => {
      for (const n of ['9876543210', '6000000000', '7123456789', '8999999999']) {
        expect(isValidNationalNumber(india, n)).toBe(true)
      }
    })

    it('rejects wrong lengths and landline-style leading digits', () => {
      for (const n of ['987654321', '98765432101', '1234567890', '5876543210', '']) {
        expect(isValidNationalNumber(india, n)).toBe(false)
      }
    })

    it('ignores separators when validating', () => {
      expect(isValidNationalNumber(india, '98765 43210')).toBe(true)
    })
  })

  describe('splitPhone', () => {
    it('parses the canonical stored form', () => {
      const { country, national } = splitPhone('+91 9876543210')
      expect(country.iso).toBe('IN')
      expect(national).toBe('9876543210')
    })

    it('never confuses +971 with +91', () => {
      const { country, national } = splitPhone('+971501234567')
      expect(country.iso).toBe('AE')
      expect(national).toBe('501234567')
    })

    it('reads legacy bare digits as Indian', () => {
      expect(splitPhone('9876543210').country.iso).toBe('IN')
      // Colloquial prefixes normalise away.
      expect(splitPhone('09876543210').national).toBe('9876543210')
      expect(splitPhone('919876543210').national).toBe('9876543210')
    })

    it('handles empty input', () => {
      const { country, national } = splitPhone('')
      expect(country.iso).toBe('IN')
      expect(national).toBe('')
    })
  })

  describe('formatPhone', () => {
    it('produces the canonical stored form', () => {
      expect(formatPhone(getCountry('IN'), '98765 43210')).toBe('+91 9876543210')
    })

    it('round-trips through splitPhone', () => {
      const stored = formatPhone(getCountry('AE'), '501234567')
      const { country, national } = splitPhone(stored)
      expect(formatPhone(country, national)).toBe(stored)
    })
  })

  describe('isValidPhone', () => {
    it('treats empty as valid — no phone on file is a legal state', () => {
      expect(isValidPhone('')).toBe(true)
      expect(isValidPhone(null)).toBe(true)
      expect(isValidPhone(undefined)).toBe(true)
    })

    it('validates full stored strings by their country', () => {
      expect(isValidPhone('+91 9876543210')).toBe(true)
      expect(isValidPhone('+91 1234567890')).toBe(false) // bad leading digit
      expect(isValidPhone('+971 501234567')).toBe(true)
      expect(isValidPhone('+971 5012345')).toBe(false) // too short
    })

    it('validates legacy bare numbers as Indian', () => {
      expect(isValidPhone('9876543210')).toBe(true)
      expect(isValidPhone('12345')).toBe(false)
    })
  })
})
