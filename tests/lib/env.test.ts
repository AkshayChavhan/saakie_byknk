import { describe, it, expect, vi, afterEach } from 'vitest'
import { inspectEnv, assertEnv } from '@/lib/server/env'

const full = {
  DATABASE_URL: 'mongodb://x',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk',
  CLERK_SECRET_KEY: 'sk',
  NEXT_PUBLIC_APP_URL: 'http://localhost',
}

describe('inspectEnv', () => {
  it('reports missing required variables', () => {
    const r = inspectEnv({ ...full, DATABASE_URL: '' })
    expect(r.missingRequired).toEqual(['DATABASE_URL'])
  })

  it('distinguishes a disabled integration from a half-configured one', () => {
    const r = inspectEnv({ ...full, RAZORPAY_KEY_ID: 'id' })
    expect(r.partialGroups['Razorpay payments']).toEqual(['RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'])
    expect(r.disabled).toContain('Stripe payments')
  })
})

describe('assertEnv', () => {
  afterEach(() => vi.restoreAllMocks())

  it('throws in production when a required variable is missing', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    expect(() => assertEnv({ ...full, CLERK_SECRET_KEY: '', NODE_ENV: 'production' })).toThrow(/CLERK_SECRET_KEY/)
  })

  it('only logs during next build and outside production', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    expect(() =>
      assertEnv({ ...full, CLERK_SECRET_KEY: '', NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' })
    ).not.toThrow()
    expect(() => assertEnv({ ...full, CLERK_SECRET_KEY: '', NODE_ENV: 'development' })).not.toThrow()
    expect(error).toHaveBeenCalled()
  })
})
