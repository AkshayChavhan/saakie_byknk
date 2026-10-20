import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => ({ headers: vi.fn() }))

import { deviceFromHeaders } from '@/lib/server/device'

describe('deviceFromHeaders', () => {
  it('trusts the client hint when the browser sends one', () => {
    expect(deviceFromHeaders({ chMobile: '?1', userAgent: 'Mozilla/5.0 (Macintosh)' })).toBe('MOBILE')
    expect(deviceFromHeaders({ chMobile: '?0', userAgent: 'Mozilla/5.0 (iPhone) Mobile' })).toBe('DESKTOP')
  })

  it('falls back to the user agent string', () => {
    expect(deviceFromHeaders({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148 Safari' })).toBe('MOBILE')
    expect(deviceFromHeaders({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari' })).toBe('MOBILE')
    expect(deviceFromHeaders({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari' })).toBe('DESKTOP')
    expect(deviceFromHeaders({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome' })).toBe('DESKTOP')
  })

  it('treats an unknown visitor as a laptop', () => {
    expect(deviceFromHeaders({})).toBe('DESKTOP')
    expect(deviceFromHeaders({ chMobile: null, userAgent: null })).toBe('DESKTOP')
  })
})
