import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetStoreSettings = vi.fn()
vi.mock('@/lib/server/settings', () => ({
  getStoreSettings: () => mockGetStoreSettings(),
}))

describe('GET /api/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes shippingEnabled for the cart and checkout totals', async () => {
    mockGetStoreSettings.mockResolvedValue({ shippingEnabled: false, updatedAt: null })
    const { GET } = await import('@/app/api/settings/route')

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ shippingEnabled: false })
  })

  it('does not leak anything beyond the customer-safe subset', async () => {
    mockGetStoreSettings.mockResolvedValue({
      shippingEnabled: true,
      updatedAt: '2026-09-26T08:00:00.000Z',
    })
    const { GET } = await import('@/app/api/settings/route')

    expect(Object.keys(await (await GET()).json())).toEqual(['shippingEnabled'])
  })

  it('is never cached, so a flipped switch shows on the next load', async () => {
    mockGetStoreSettings.mockResolvedValue({ shippingEnabled: true, updatedAt: null })
    const { GET } = await import('@/app/api/settings/route')

    expect((await GET()).headers.get('Cache-Control')).toBe('no-store')
  })

  it('needs no session — it is public', async () => {
    mockGetStoreSettings.mockResolvedValue({ shippingEnabled: true, updatedAt: null })
    const { GET } = await import('@/app/api/settings/route')

    expect((await GET()).status).toBe(200)
  })
})
