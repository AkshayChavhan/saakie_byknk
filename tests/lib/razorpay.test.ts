import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Razorpay before importing
vi.mock('razorpay', () => ({
  default: vi.fn(() => ({
    orders: {
      create: vi.fn(),
    },
    payments: {
      fetch: vi.fn(),
    },
  })),
}))

describe('razorpay utilities', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.RAZORPAY_KEY_ID
    delete process.env.RAZORPAY_KEY_SECRET
    delete process.env.RAZORPAY_WEBHOOK_SECRET
  })

  describe('formatAmountForRazorpay', () => {
    it('converts rupees to paise', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      const { formatAmountForRazorpay } = await import('@/lib/razorpay')
      expect(formatAmountForRazorpay(100)).toBe(10000)
    })

    it('handles decimal amounts', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      const { formatAmountForRazorpay } = await import('@/lib/razorpay')
      expect(formatAmountForRazorpay(99.99)).toBe(9999)
    })

    it('handles zero', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      const { formatAmountForRazorpay } = await import('@/lib/razorpay')
      expect(formatAmountForRazorpay(0)).toBe(0)
    })

    it('rounds correctly', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      const { formatAmountForRazorpay } = await import('@/lib/razorpay')
      expect(formatAmountForRazorpay(10.555)).toBe(1056)
    })

    it('handles large amounts', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      const { formatAmountForRazorpay } = await import('@/lib/razorpay')
      expect(formatAmountForRazorpay(99999.99)).toBe(9999999)
    })
  })

  describe('formatAmountFromRazorpay', () => {
    it('converts paise to rupees', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      const { formatAmountFromRazorpay } = await import('@/lib/razorpay')
      expect(formatAmountFromRazorpay(10000)).toBe(100)
    })

    it('handles odd amounts', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      const { formatAmountFromRazorpay } = await import('@/lib/razorpay')
      expect(formatAmountFromRazorpay(9999)).toBe(99.99)
    })

    it('handles zero', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      const { formatAmountFromRazorpay } = await import('@/lib/razorpay')
      expect(formatAmountFromRazorpay(0)).toBe(0)
    })

    it('handles large amounts', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      const { formatAmountFromRazorpay } = await import('@/lib/razorpay')
      expect(formatAmountFromRazorpay(9999999)).toBe(99999.99)
    })
  })

  describe('isRazorpayEnabled', () => {
    it('returns true when all keys are set', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook'
      const { isRazorpayEnabled } = await import('@/lib/razorpay')
      expect(isRazorpayEnabled()).toBe(true)
    })

    it('returns false when key id is missing', async () => {
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook'
      const { isRazorpayEnabled } = await import('@/lib/razorpay')
      expect(isRazorpayEnabled()).toBe(false)
    })

    it('returns false when key secret is missing', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook'
      const { isRazorpayEnabled } = await import('@/lib/razorpay')
      expect(isRazorpayEnabled()).toBe(false)
    })

    it('returns false when webhook secret is missing', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      const { isRazorpayEnabled } = await import('@/lib/razorpay')
      expect(isRazorpayEnabled()).toBe(false)
    })

    it('returns false when all keys are missing', async () => {
      const { isRazorpayEnabled } = await import('@/lib/razorpay')
      expect(isRazorpayEnabled()).toBe(false)
    })
  })

  describe('razorpay client', () => {
    it('initializes razorpay when keys are provided', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      const { razorpay } = await import('@/lib/razorpay')
      expect(razorpay).not.toBeNull()
    })

    it('returns null when key id is not provided', async () => {
      process.env.RAZORPAY_KEY_SECRET = 'test_secret'
      const { razorpay } = await import('@/lib/razorpay')
      expect(razorpay).toBeNull()
    })

    it('returns null when key secret is not provided', async () => {
      process.env.RAZORPAY_KEY_ID = 'test_key'
      const { razorpay } = await import('@/lib/razorpay')
      expect(razorpay).toBeNull()
    })
  })
})
