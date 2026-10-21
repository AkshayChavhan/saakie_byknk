// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSearch = vi.fn()
vi.mock('@/lib/server/search', () => ({ searchSuggestions: (q: string) => mockSearch(q) }))
const mockLimit = vi.fn()
vi.mock('@/lib/server/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockLimit(...args),
  clientIp: () => '1.2.3.4',
}))

const get = async (q: string) => {
  const { GET } = await import('@/app/api/search/suggest/route')
  return GET(new Request(`http://localhost:3000/api/search/suggest?q=${encodeURIComponent(q)}`))
}

describe('GET /api/search/suggest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLimit.mockResolvedValue({ allowed: true, retryAfter: 0 })
  })

  it('answers an empty query with empty lists and no search', async () => {
    const response = await get('  ')
    expect(await response.json()).toEqual({ query: '', products: [], categories: [] })
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('returns the suggestions for the typed letters', async () => {
    mockSearch.mockResolvedValue({ query: 'meh', products: [{ id: 'p1' }], categories: [] })

    const response = await get('meh')

    expect(response.status).toBe(200)
    expect(mockSearch).toHaveBeenCalledWith('meh')
    expect((await response.json()).products).toEqual([{ id: 'p1' }])
  })

  it('slows down a visitor who floods it', async () => {
    mockLimit.mockResolvedValue({ allowed: false, retryAfter: 12 })

    const response = await get('meh')

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('12')
    expect(mockSearch).not.toHaveBeenCalled()
  })
})
