import { describe, it, expect } from 'vitest'
import { rateLimit, clientIp } from '@/lib/server/rate-limit'

describe('rateLimit', () => {
  // A unique key per test keeps the shared in-memory map from leaking state
  // between cases.
  let n = 0
  const key = () => `test-key-${n++}`

  it('allows requests up to the limit within a window', () => {
    const k = key()
    const now = 1_000_000
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(k, 5, 60_000, now).allowed).toBe(true)
    }
  })

  it('blocks the request that exceeds the limit', () => {
    const k = key()
    const now = 1_000_000
    for (let i = 0; i < 3; i++) rateLimit(k, 3, 60_000, now)

    const result = rateLimit(k, 3, 60_000, now)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('resets after the window elapses', () => {
    const k = key()
    const start = 1_000_000
    for (let i = 0; i < 2; i++) rateLimit(k, 2, 60_000, start)
    expect(rateLimit(k, 2, 60_000, start).allowed).toBe(false)

    // Past the reset boundary, the bucket starts fresh.
    expect(rateLimit(k, 2, 60_000, start + 60_001).allowed).toBe(true)
  })

  it('tracks separate keys independently', () => {
    const a = key()
    const b = key()
    const now = 1_000_000
    rateLimit(a, 1, 60_000, now)
    expect(rateLimit(a, 1, 60_000, now).allowed).toBe(false)
    // A different key is unaffected.
    expect(rateLimit(b, 1, 60_000, now).allowed).toBe(true)
  })
})

describe('clientIp', () => {
  it('uses the first entry of x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
    })
    expect(clientIp(req)).toBe('203.0.113.1')
  })

  it('falls back to x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '203.0.113.9' },
    })
    expect(clientIp(req)).toBe('203.0.113.9')
  })

  it('returns "unknown" when no ip headers are present', () => {
    const req = new Request('http://localhost')
    expect(clientIp(req)).toBe('unknown')
  })
})
