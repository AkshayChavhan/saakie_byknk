import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockProduct } from '../mocks/factories'

/**
 * The listing filters, sorts and pages a cached catalogue in memory
 * (lib/server/catalogue.ts). These tests hand the catalogue query a set of
 * products and check what each combination of parameters returns.
 */
const mockPrisma = vi.hoisted(() => ({
  product: { findMany: vi.fn() },
  category: { findMany: vi.fn() },
  review: { groupBy: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

// Record how the catalogue is cached; otherwise pass straight through.
const cacheCalls = vi.hoisted(() => [] as Array<{ key: string; tags: string[] }>)
vi.mock('@/lib/server/cache', () => ({
  TAG: { products: 'products', categories: 'categories' },
  cached: (fn: unknown, key: string, opts: { tags: string[] }) => {
    cacheCalls.push({ key, tags: opts.tags })
    return fn
  },
}))

/** Categories: Silk (top) > Banarasi (sub), Cotton (top), Retired (inactive). */
const CATEGORIES = [
  { id: 'cat_silk', slug: 'silk', parentId: null, isActive: true },
  { id: 'cat_banarasi', slug: 'banarasi', parentId: 'cat_silk', isActive: true },
  { id: 'cat_cotton', slug: 'cotton', parentId: null, isActive: true },
  { id: 'cat_retired', slug: 'retired', parentId: null, isActive: false },
]

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

/** A catalogue row as the loader's query returns it. */
const row = (id: string, extra: Record<string, unknown> = {}) =>
  createMockProduct({
    id,
    slug: id,
    name: `Saree ${id}`,
    description: 'Handwoven saree',
    tags: [],
    price: 3000,
    comparePrice: null,
    stock: 1,
    isFeatured: false,
    rating: 0,
    salesCount: 0,
    categoryId: 'cat_cotton',
    category: { name: 'Cotton', slug: 'cotton' },
    createdAt: daysAgo(100),
    _count: { reviews: 0 },
    ...extra,
  })

function catalogue(products: unknown[]) {
  mockPrisma.product.findMany.mockResolvedValue(products)
}

async function list(query = '') {
  const { GET } = await import('@/app/api/products/route')
  const response = await GET(new NextRequest(`http://localhost:3000/api/products${query ? `?${query}` : ''}`))
  return { status: response.status, data: await response.json() }
}

const slugs = (data: { products: Array<{ slug: string }> }) => data.products.map((p) => p.slug)

describe('GET /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.category.findMany.mockImplementation(
      ({ where, select }: { where?: { isActive?: boolean }; select: Record<string, boolean> }) =>
        Promise.resolve(
          CATEGORIES.filter((c) => where?.isActive === undefined || c.isActive === where.isActive).map((c) =>
            Object.fromEntries(Object.keys(select).map((k) => [k, c[k as keyof typeof c]]))
          )
        )
    )
  })

  describe('catalogue', () => {
    it('is cached and cleared by any product or category change', async () => {
      await import('@/lib/server/catalogue')
      expect(cacheCalls).toContainEqual({ key: 'product-catalogue', tags: ['products', 'categories'] })
    })

    it('loads every active product once, with no per-filter query', async () => {
      catalogue([])
      await list('sale=true&minPrice=1000&search=silk')

      const { where, select } = mockPrisma.product.findMany.mock.calls[0][0]
      expect(where).toEqual({ isActive: true })
      // Approved reviews only, counted in the same read.
      expect(select._count.select.reviews).toEqual({ where: { status: 'APPROVED' } })
      expect(mockPrisma.review.groupBy).not.toHaveBeenCalled()
    })

    it('answers 500 when the database fails', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'))
      vi.spyOn(console, 'error').mockImplementation(() => {})

      expect((await list()).status).toBe(500)
    })
  })

  describe('paging', () => {
    it('returns the requested page and accurate totals', async () => {
      catalogue(Array.from({ length: 30 }, (_, i) => row(`p${String(i).padStart(2, '0')}`, { createdAt: daysAgo(i + 40) })))

      const { data } = await list('page=2&limit=12')

      expect(data.products).toHaveLength(12)
      expect(data.products[0].slug).toBe('p12')
      expect(data.pagination).toEqual({ page: 2, limit: 12, totalCount: 30, totalPages: 3, hasNext: true, hasPrev: true })
    })

    it('defaults to twelve per page, first page', async () => {
      catalogue(Array.from({ length: 13 }, (_, i) => row(`p${i}`)))

      const { data } = await list()

      expect(data.products).toHaveLength(12)
      expect(data.pagination).toMatchObject({ page: 1, limit: 12, totalCount: 13, hasNext: true, hasPrev: false })
    })
  })

  describe('filters', () => {
    it('scopes a category to itself and its sub-categories', async () => {
      catalogue([
        row('own', { categoryId: 'cat_silk' }),
        row('sub', { categoryId: 'cat_banarasi' }),
        row('other', { categoryId: 'cat_cotton' }),
      ])

      expect(slugs((await list('category=silk')).data).sort()).toEqual(['own', 'sub'])
      expect(slugs((await list('category=banarasi')).data)).toEqual(['sub'])
    })

    it('still finds products under an inactive category by its slug, as before', async () => {
      catalogue([row('kept', { categoryId: 'cat_retired' }), row('other')])

      expect(slugs((await list('category=retired')).data)).toEqual(['kept'])
    })

    it('matches nothing for an unknown category instead of everything', async () => {
      catalogue([row('a'), row('b')])

      const { data } = await list('category=no-such-category')

      expect(data.products).toEqual([])
      expect(data.pagination.totalCount).toBe(0)
    })

    it('keeps only genuine markdowns when sale=true', async () => {
      catalogue([
        row('marked-down', { price: 2000, comparePrice: 2500 }),
        row('same-price', { price: 2000, comparePrice: 2000 }),
        row('no-compare', { price: 2000, comparePrice: null }),
      ])

      expect(slugs((await list('sale=true')).data)).toEqual(['marked-down'])
      expect((await list('sale=false')).data.products).toHaveLength(3)
    })

    it('filters by price, both ends inclusive', async () => {
      catalogue([row('cheap', { price: 999 }), row('low', { price: 1000 }), row('high', { price: 5000 }), row('dear', { price: 5001 })])

      expect(slugs((await list('minPrice=1000&maxPrice=5000')).data).sort()).toEqual(['high', 'low'])
      expect(slugs((await list('minPrice=5000')).data).sort()).toEqual(['dear', 'high'])
    })

    it('filters to in-stock and featured products', async () => {
      catalogue([row('sold-out', { stock: 0 }), row('in-stock', { stock: 2, isFeatured: true })])

      expect(slugs((await list('inStock=true')).data)).toEqual(['in-stock'])
      expect(slugs((await list('featured=true')).data)).toEqual(['in-stock'])
    })

    it('keeps products with at least one requested colour', async () => {
      catalogue([
        row('red', { colors: [{ hexCode: '#FF0000' }] }),
        row('blue', { colors: [{ hexCode: '#0000FF' }] }),
        row('green', { colors: [{ hexCode: '#00FF00' }] }),
      ])

      expect(slugs((await list('colors=%23FF0000,%230000FF')).data).sort()).toEqual(['blue', 'red'])
    })

    it('searches name and description in any case, and tags exactly', async () => {
      catalogue([
        row('by-name', { name: 'Royal SILK Saree' }),
        row('by-description', { description: 'Pure silk with zari' }),
        row('by-tag', { tags: ['wedding'] }),
        row('none', { name: 'Cotton Saree' }),
      ])

      expect(slugs((await list('search=silk')).data).sort()).toEqual(['by-description', 'by-name'])
      expect(slugs((await list('search=wedding')).data)).toEqual(['by-tag'])
      expect((await list('search=WEDDING')).data.products).toEqual([])
    })
  })

  describe('sorting', () => {
    const SORTABLE = [
      row('a', { price: 3000, salesCount: 5, rating: 4.1, createdAt: daysAgo(3) }),
      row('b', { price: 1000, salesCount: 20, rating: 4.8, createdAt: daysAgo(2) }),
      row('c', { price: 5000, salesCount: 5, rating: 4.8, createdAt: daysAgo(1) }),
    ]

    it('sorts newest first by default', async () => {
      catalogue(SORTABLE)
      expect(slugs((await list()).data)).toEqual(['c', 'b', 'a'])
    })

    it('sorts by price both ways', async () => {
      catalogue(SORTABLE)
      expect(slugs((await list('sort=price-low')).data)).toEqual(['b', 'a', 'c'])
      expect(slugs((await list('sort=price-high')).data)).toEqual(['c', 'a', 'b'])
    })

    it('sorts popular and rating on the maintained fields, newest breaking ties', async () => {
      catalogue(SORTABLE)
      expect(slugs((await list('sort=popular')).data)).toEqual(['b', 'c', 'a'])
      expect(slugs((await list('sort=rating')).data)).toEqual(['c', 'b', 'a'])
    })
  })

  describe('response shape', () => {
    it('formats each card with the fields the grid reads', async () => {
      catalogue([
        row('fresh', {
          createdAt: daysAgo(10),
          salesCount: 15,
          stock: 0,
          rating: 4.25,
          comparePrice: 3500,
          _count: { reviews: 7 },
          colors: [{ hexCode: '#FF0000' }, { hexCode: '#0000FF' }, { hexCode: '#FF0000' }],
          images: [],
        }),
      ])

      const { data } = await list()

      expect(data.products[0]).toEqual({
        id: 'fresh',
        name: 'Saree fresh',
        slug: 'fresh',
        price: 3000,
        comparePrice: 3500,
        rating: 4.3,
        reviews: 7,
        image: '/images/placeholder-product.svg',
        colors: ['#FF0000', '#0000FF'],
        category: { name: 'Cotton', slug: 'cotton' },
        stock: 0,
        isNew: true,
        isBestseller: true,
        inStock: false,
      })
    })

    it('marks a product new only within 30 days of being added', async () => {
      catalogue([row('old', { createdAt: daysAgo(31) })])
      expect((await list()).data.products[0].isNew).toBe(false)
    })

    it('reports 0 for a product with no rating yet', async () => {
      catalogue([row('unrated')])
      expect((await list()).data.products[0].rating).toBe(0)
    })
  })
})
