import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  product: { findMany: vi.fn() },
  category: { findMany: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

// Record how the index is cached; otherwise pass straight through, as tests do.
const cacheCalls = vi.hoisted(() => [] as Array<{ key: string; tags: string[] }>)
vi.mock('@/lib/server/cache', () => ({
  TAG: { products: 'products', categories: 'categories' },
  cached: (fn: unknown, key: string, opts: { tags: string[] }) => {
    cacheCalls.push({ key, tags: opts.tags })
    return fn
  },
}))

import { matchRank, searchSuggestions } from '@/lib/server/search'

const product = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  slug: id,
  price: 1000,
  fabric: null,
  pattern: null,
  images: [{ url: `https://example.com/${id}.jpg` }],
  category: { name: 'Chiffon' },
  ...extra,
})

const catalogue = (products: unknown[], categories: unknown[] = []) => {
  mockPrisma.product.findMany.mockResolvedValue(products)
  mockPrisma.category.findMany.mockResolvedValue(categories)
}

describe('matchRank', () => {
  it('prefers a name that starts with the letters, then a word that does, then anywhere', () => {
    expect(matchRank('Meher Silk', 'meh')).toBe(0)
    expect(matchRank('Royal Meher', 'meh')).toBe(1)
    expect(matchRank('Kameher', 'meh')).toBe(2)
    expect(matchRank('Sitara', 'meh')).toBe(3)
    expect(matchRank(null, 'meh')).toBe(3)
  })
})

describe('search index cache', () => {
  it('is cached and cleared by any product or category change', () => {
    expect(cacheCalls).toContainEqual({ key: 'search-index', tags: ['products', 'categories'] })
  })

  it('loads every active saree and category, with no filter per letter', async () => {
    vi.clearAllMocks()
    catalogue([])

    await searchSuggestions('meh')

    expect(mockPrisma.product.findMany.mock.calls[0][0].where).toEqual({ isActive: true })
    expect(mockPrisma.category.findMany.mock.calls[0][0].where).toEqual({ isActive: true })
  })
})

describe('searchSuggestions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns nothing for an empty query without loading the index', async () => {
    expect(await searchSuggestions('   ')).toEqual({ query: '', products: [], categories: [] })
    expect(mockPrisma.product.findMany).not.toHaveBeenCalled()
  })

  it('keeps only sarees that match, name matches first, fabric-only matches last', async () => {
    catalogue([
      product('fabric-only', 'Sitara', { fabric: 'Meher silk blend' }),
      product('no-match', 'Roohani'),
      product('anywhere', 'Kameher'),
      product('starts', 'Meher'),
      product('word', 'Royal Meher'),
    ])

    const { products } = await searchSuggestions('meh')

    expect(products.map((p) => p.id)).toEqual(['starts', 'word', 'anywhere', 'fabric-only'])
    expect(products[0]).toEqual({
      id: 'starts',
      name: 'Meher',
      slug: 'starts',
      price: 1000,
      image: 'https://example.com/starts.jpg',
      category: 'Chiffon',
    })
  })

  it('matches regardless of case and surrounding spaces', async () => {
    catalogue([product('a', 'MEHER')], [{ id: 'c', name: 'Meher Edit', slug: 'meher-edit' }])

    const result = await searchSuggestions('  meH ')

    expect(result.query).toBe('meH')
    expect(result.products.map((p) => p.id)).toEqual(['a'])
    expect(result.categories.map((c) => c.id)).toEqual(['c'])
  })

  it('finds a saree through its category name', async () => {
    catalogue([product('a', 'Roohani', { category: { name: 'Chiffon' } }), product('b', 'Sitara', { category: { name: 'Mul Cotton' } })])

    const { products } = await searchSuggestions('chif')

    expect(products.map((p) => p.id)).toEqual(['a'])
  })

  it('keeps the newest first among equal matches', async () => {
    // The index is newest first, as the query orders it.
    catalogue([product('newer', 'Meher'), product('older', 'Meher')])

    const { products } = await searchSuggestions('meher')

    expect(products.map((p) => p.id)).toEqual(['newer', 'older'])
  })

  it('caps the results at six sarees and three categories', async () => {
    catalogue(
      Array.from({ length: 10 }, (_, i) => product(`p${i}`, `Silk ${i}`)),
      Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, name: `Silk ${i}`, slug: `c${i}` }))
    )

    const result = await searchSuggestions('silk')

    expect(result.products).toHaveLength(6)
    expect(result.categories).toHaveLength(3)
  })
})
