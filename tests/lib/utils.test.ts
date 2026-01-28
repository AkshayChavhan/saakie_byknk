import { describe, it, expect } from 'vitest'
import { cn, formatPrice, formatDate, truncate, slugify, getInitials } from '@/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('handles arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar')
    })

    it('handles objects', () => {
      expect(cn({ foo: true, bar: false })).toBe('foo')
    })

    it('merges tailwind classes correctly', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2')
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('handles undefined and null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
    })
  })

  describe('formatPrice', () => {
    it('formats price in INR currency', () => {
      const result = formatPrice(5999)
      expect(result).toContain('5,999')
      expect(result).toContain('₹')
    })

    it('formats zero correctly', () => {
      const result = formatPrice(0)
      expect(result).toContain('0')
    })

    it('formats large numbers correctly', () => {
      const result = formatPrice(999999)
      expect(result).toContain('9,99,999')
    })

    it('rounds decimal numbers', () => {
      const result = formatPrice(5999.99)
      expect(result).toContain('6,000')
    })

    it('handles negative numbers', () => {
      const result = formatPrice(-500)
      expect(result).toContain('500')
    })
  })

  describe('formatDate', () => {
    it('formats date object correctly', () => {
      const date = new Date('2024-01-15')
      const result = formatDate(date)
      expect(result).toContain('Jan')
      expect(result).toContain('2024')
      expect(result).toContain('15')
    })

    it('formats date string correctly', () => {
      const result = formatDate('2024-06-20')
      expect(result).toContain('Jun')
      expect(result).toContain('2024')
      expect(result).toContain('20')
    })

    it('handles ISO string format', () => {
      const result = formatDate('2024-12-25T10:30:00.000Z')
      expect(result).toContain('Dec')
      expect(result).toContain('2024')
    })
  })

  describe('truncate', () => {
    it('truncates long strings', () => {
      const result = truncate('This is a very long string that should be truncated', 20)
      expect(result).toBe('This is a very long ...')
      expect(result.length).toBe(23)
    })

    it('does not truncate short strings', () => {
      const result = truncate('Short', 20)
      expect(result).toBe('Short')
    })

    it('handles exact length strings', () => {
      const result = truncate('12345', 5)
      expect(result).toBe('12345')
    })

    it('handles empty strings', () => {
      const result = truncate('', 10)
      expect(result).toBe('')
    })

    it('handles length of 0', () => {
      const result = truncate('Hello', 0)
      expect(result).toBe('...')
    })
  })

  describe('slugify', () => {
    it('converts spaces to hyphens', () => {
      expect(slugify('Hello World')).toBe('hello-world')
    })

    it('converts to lowercase', () => {
      expect(slugify('HELLO')).toBe('hello')
    })

    it('removes special characters', () => {
      expect(slugify('Hello! @World#')).toBe('hello-world')
    })

    it('handles multiple spaces', () => {
      expect(slugify('Hello    World')).toBe('hello-world')
    })

    it('handles leading and trailing spaces', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world')
    })

    it('handles multiple hyphens', () => {
      expect(slugify('Hello---World')).toBe('hello-world')
    })

    it('handles unicode characters', () => {
      expect(slugify('Café Résumé')).toBe('caf-rsum')
    })

    it('handles empty strings', () => {
      expect(slugify('')).toBe('')
    })

    it('handles numbers', () => {
      expect(slugify('Product 123')).toBe('product-123')
    })

    it('handles mixed content', () => {
      expect(slugify('Silk Saree (Premium) - 2024')).toBe('silk-saree-premium-2024')
    })
  })

  describe('getInitials', () => {
    it('returns initials for two word names', () => {
      expect(getInitials('John Doe')).toBe('JD')
    })

    it('returns initials for single word names', () => {
      expect(getInitials('John')).toBe('J')
    })

    it('returns max two initials for long names', () => {
      expect(getInitials('John Michael Doe Smith')).toBe('JM')
    })

    it('converts to uppercase', () => {
      expect(getInitials('john doe')).toBe('JD')
    })

    it('handles names with extra spaces', () => {
      expect(getInitials('John  Doe')).toBe('JD')
    })

    it('handles empty strings', () => {
      expect(getInitials('')).toBe('')
    })

    it('handles single character names', () => {
      expect(getInitials('A B')).toBe('AB')
    })
  })
})
