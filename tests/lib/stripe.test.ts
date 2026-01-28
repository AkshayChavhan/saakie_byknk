import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Stripe before importing
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
  })),
}))

describe('stripe utilities', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  describe('formatAmountForStripe', () => {
    it('converts rupees to paise', async () => {
      process.env.STRIPE_SECRET_KEY = 'test_key'
      const { formatAmountForStripe } = await import('@/lib/stripe')
      expect(formatAmountForStripe(100)).toBe(10000)
    })

    it('handles decimal amounts', async () => {
      process.env.STRIPE_SECRET_KEY = 'test_key'
      const { formatAmountForStripe } = await import('@/lib/stripe')
      expect(formatAmountForStripe(99.99)).toBe(9999)
    })

    it('handles zero', async () => {
      process.env.STRIPE_SECRET_KEY = 'test_key'
      const { formatAmountForStripe } = await import('@/lib/stripe')
      expect(formatAmountForStripe(0)).toBe(0)
    })

    it('rounds correctly', async () => {
      process.env.STRIPE_SECRET_KEY = 'test_key'
      const { formatAmountForStripe } = await import('@/lib/stripe')
      expect(formatAmountForStripe(10.555)).toBe(1056)
    })
  })

  describe('formatAmountFromStripe', () => {
    it('converts paise to rupees', async () => {
      process.env.STRIPE_SECRET_KEY = 'test_key'
      const { formatAmountFromStripe } = await import('@/lib/stripe')
      expect(formatAmountFromStripe(10000)).toBe(100)
    })

    it('handles odd amounts', async () => {
      process.env.STRIPE_SECRET_KEY = 'test_key'
      const { formatAmountFromStripe } = await import('@/lib/stripe')
      expect(formatAmountFromStripe(9999)).toBe(99.99)
    })

    it('handles zero', async () => {
      process.env.STRIPE_SECRET_KEY = 'test_key'
      const { formatAmountFromStripe } = await import('@/lib/stripe')
      expect(formatAmountFromStripe(0)).toBe(0)
    })
  })

  describe('isStripeEnabled', () => {
    it('returns true when both keys are set', async () => {
      process.env.STRIPE_SECRET_KEY = 'test_secret_key'
      process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_secret'
      const { isStripeEnabled } = await import('@/lib/stripe')
      expect(isStripeEnabled()).toBe(true)
    })

    it('returns false when secret key is missing', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'test_webhook_secret'
      const { isStripeEnabled } = await import('@/lib/stripe')
      expect(isStripeEnabled()).toBe(false)
    })

    it('returns false when webhook secret is missing', async () => {
      process.env.STRIPE_SECRET_KEY = 'test_secret_key'
      const { isStripeEnabled } = await import('@/lib/stripe')
      expect(isStripeEnabled()).toBe(false)
    })

    it('returns false when both keys are missing', async () => {
      const { isStripeEnabled } = await import('@/lib/stripe')
      expect(isStripeEnabled()).toBe(false)
    })
  })

  describe('stripe client', () => {
    it('initializes stripe when key is provided', async () => {
      process.env.STRIPE_SECRET_KEY = 'test_secret_key'
      const { stripe } = await import('@/lib/stripe')
      expect(stripe).not.toBeNull()
    })

    it('returns null when key is not provided', async () => {
      const { stripe } = await import('@/lib/stripe')
      expect(stripe).toBeNull()
    })
  })
})
