import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockCategory, createMany } from '../mocks/factories'

// Mock Prisma
const mockPrisma = {
  category: {
    findMany: vi.fn(),
  },
  product: {
    groupBy: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

/**
 * The route makes two `category.findMany` calls — the storefront query
 * (`parentId: null`) and the tree load behind the sub-category rollup. Route
 * them by their `where` clause so the tests don't depend on call ordering.
 */
const mockCategories = (
  storefront: unknown[],
  tree: unknown[] = storefront
) => {
  mockPrisma.category.findMany.mockImplementation((args: any) =>
    Promise.resolve(args?.where?.parentId === null ? storefront : tree)
  )
}

/** Direct product counts keyed by category id, as `product.groupBy` returns them. */
const mockProductCounts = (counts: Record<string, number>) => {
  mockPrisma.product.groupBy.mockResolvedValue(
    Object.entries(counts).map(([categoryId, n]) => ({
      categoryId,
      _count: { _all: n },
    }))
  )
}

describe('Categories API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCategories([])
    mockProductCounts({})
  })

  describe('GET /api/categories', () => {
    it('returns active categories', async () => {
      const categories = createMany(createMockCategory, 3, (index) => ({
        id: `cat_${index}`,
        name: `Category ${index}`,
        slug: `category-${index}`,
        _count: { products: index * 5 },
      }))
      mockCategories(categories)

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(3)
    })

    it('only returns active categories', async () => {
      mockCategories([])

      const { GET } = await import('@/app/api/categories/route')
      await GET()

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // Public storefront shows only top-level categories.
          where: { isActive: true, parentId: null },
        })
      )
    })

    it('orders categories by name', async () => {
      mockCategories([])

      const { GET } = await import('@/app/api/categories/route')
      await GET()

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      )
    })

    it('formats response correctly', async () => {
      const category = createMockCategory({
        id: 'cat_123',
        name: 'Sarees',
        slug: 'sarees',
        image: 'https://example.com/image.jpg',
      })
      mockCategories([category])
      mockProductCounts({ cat_123: 10 })

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0]).toEqual({
        id: 'cat_123',
        name: 'Sarees',
        slug: 'sarees',
        image: 'https://example.com/image.jpg',
        count: 10,
      })
    })

    it('uses placeholder image when category has no image and no products', async () => {
      const category = createMockCategory({
        image: null,
        _count: { products: 5 },
      })
      mockCategories([category])

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].image).toBe('/images/placeholder-category.svg')
    })

    it('falls back to a product image when the category has no image', async () => {
      const category = createMockCategory({
        image: null,
        products: [{ images: [{ url: 'https://example.com/own-product.jpg' }] }],
      })
      mockCategories([category])

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].image).toBe('https://example.com/own-product.jpg')
    })

    it('falls back to a sub-category product image when it has none of its own', async () => {
      const category = createMockCategory({
        image: null,
        products: [],
        children: [
          { products: [] },
          { products: [{ images: [{ url: 'https://example.com/child-product.jpg' }] }] },
        ],
      })
      mockCategories([category])

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].image).toBe('https://example.com/child-product.jpg')
    })

    it('prefers the uploaded category image over any product image', async () => {
      const category = createMockCategory({
        image: 'https://example.com/uploaded.jpg',
        products: [{ images: [{ url: 'https://example.com/own-product.jpg' }] }],
        children: [{ products: [{ images: [{ url: 'https://example.com/child.jpg' }] }] }],
      })
      mockCategories([category])

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].image).toBe('https://example.com/uploaded.jpg')
    })

    it('includes product count', async () => {
      const category = createMockCategory({ id: 'cat_123' })
      mockCategories([category])
      mockProductCounts({ cat_123: 25 })

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].count).toBe(25)
    })

    it('counts products held by sub-categories', async () => {
      // Chiffon: nothing attached directly, 3 under one child and 2 under
      // another. The card must read 5, not 0.
      const chiffon = createMockCategory({ id: 'chiffon', name: 'Chiffon' })
      mockCategories(
        [chiffon],
        [
          { id: 'chiffon', parentId: null },
          { id: 'handwork', parentId: 'chiffon' },
          { id: 'gotapatti', parentId: 'chiffon' },
        ]
      )
      mockProductCounts({ handwork: 3, gotapatti: 2 })

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].count).toBe(5)
    })

    it('adds a category own products to its sub-category products', async () => {
      const parent = createMockCategory({ id: 'parent' })
      mockCategories(
        [parent],
        [
          { id: 'parent', parentId: null },
          { id: 'child', parentId: 'parent' },
        ]
      )
      mockProductCounts({ parent: 4, child: 6 })

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].count).toBe(10)
    })

    it('rolls up products nested more than one level deep', async () => {
      const parent = createMockCategory({ id: 'parent' })
      mockCategories(
        [parent],
        [
          { id: 'parent', parentId: null },
          { id: 'child', parentId: 'parent' },
          { id: 'grandchild', parentId: 'child' },
        ]
      )
      mockProductCounts({ grandchild: 7 })

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].count).toBe(7)
    })

    it('does not hang when the category tree contains a cycle', async () => {
      const parent = createMockCategory({ id: 'a' })
      mockCategories(
        [parent],
        [
          { id: 'a', parentId: 'b' },
          { id: 'b', parentId: 'a' },
        ]
      )
      mockProductCounts({ a: 1, b: 2 })

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].count).toBe(3)
    })

    it('reports zero for a category whose sub-categories are all empty', async () => {
      const parent = createMockCategory({ id: 'parent' })
      mockCategories(
        [parent],
        [
          { id: 'parent', parentId: null },
          { id: 'child', parentId: 'parent' },
        ]
      )
      mockProductCounts({})

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].count).toBe(0)
    })

    it('returns empty array when no categories', async () => {
      mockCategories([])

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data).toEqual([])
    })

    it('handles database errors', async () => {
      mockPrisma.category.findMany.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
    })
  })
})
