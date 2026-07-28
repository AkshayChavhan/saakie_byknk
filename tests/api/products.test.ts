import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { createMockProduct, createMockCategory, createMany } from '../mocks/factories'

// Mock Prisma
const mockPrisma = {
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    // Prisma exposes field references here; the sale filter compares
    // comparePrice against this rather than a literal.
    fields: { price: { __fieldRef: 'price' } },
  },
  category: {
    findUnique: vi.fn(),
    // Read by getCategoryScopeIds when scoping a listing to a category subtree.
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

/** The `where` clause the route handed to Prisma for the listing query. */
const whereClause = () => mockPrisma.product.findMany.mock.calls[0][0].where

describe('Products API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.category.findMany.mockResolvedValue([])
  })

  describe('GET /api/products', () => {
    it('returns paginated products', async () => {
      const products = createMany(createMockProduct, 12, (index) => ({
        id: `product_${index}`,
        name: `Product ${index}`,
      }))
      mockPrisma.product.findMany.mockResolvedValue(products)
      mockPrisma.product.count.mockResolvedValue(24)

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products')
      const response = await GET(request)
      const data = await response.json()

      expect(data.products).toHaveLength(12)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 12,
        totalCount: 24,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      })
    })

    it('filters by category', async () => {
      const category = createMockCategory({ id: 'cat_123', slug: 'sarees' })
      mockPrisma.category.findUnique.mockResolvedValue(category)
      mockPrisma.product.findMany.mockResolvedValue([createMockProduct()])
      mockPrisma.product.count.mockResolvedValue(1)

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products?category=sarees')
      await GET(request)

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { slug: 'sarees' },
        select: { id: true },
      })
      // Scoped to the subtree, not an exact match — a parent category's
      // products hang off its sub-categories.
      expect(whereClause()).toMatchObject({ categoryId: { in: ['cat_123'] } })
    })

    it('includes sub-category products when filtering by category', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'chiffon' })
      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'chiffon', parentId: null },
        { id: 'handwork', parentId: 'chiffon' },
        { id: 'gotapatti', parentId: 'chiffon' },
      ])
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/products/route')
      await GET(new NextRequest('http://localhost:3000/api/products?category=chiffon'))

      expect(whereClause().categoryId.in.sort()).toEqual([
        'chiffon',
        'gotapatti',
        'handwork',
      ])
    })

    it('matches nothing for an unknown category slug', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null)
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/products/route')
      await GET(new NextRequest('http://localhost:3000/api/products?category=bogus'))

      // Must not fall through to an unfiltered listing of the whole catalogue.
      expect(whereClause()).toMatchObject({ categoryId: { in: [] } })
    })

    it('filters to discounted products when sale=true', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/products/route')
      await GET(new NextRequest('http://localhost:3000/api/products?sale=true'))

      // A real markdown: compare-at price strictly above the price charged.
      expect(whereClause()).toMatchObject({
        comparePrice: { gt: mockPrisma.product.fields.price },
      })
    })

    it('does not filter by sale when the param is absent', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/products/route')
      await GET(new NextRequest('http://localhost:3000/api/products'))

      expect(whereClause()).not.toHaveProperty('comparePrice')
    })

    it('does not filter by sale when sale is not true', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/products/route')
      await GET(new NextRequest('http://localhost:3000/api/products?sale=false'))

      expect(whereClause()).not.toHaveProperty('comparePrice')
    })

    it('filters by price range', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products?minPrice=1000&maxPrice=5000')
      await GET(request)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { gte: 1000, lte: 5000 },
          }),
        })
      )
    })

    it('filters by in-stock', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products?inStock=true')
      await GET(request)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stock: { gt: 0 },
          }),
        })
      )
    })

    it('sorts by price ascending', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products?sort=price-low')
      await GET(request)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        })
      )
    })

    it('sorts by price descending', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products?sort=price-high')
      await GET(request)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'desc' },
        })
      )
    })

    it('sorts by newest by default', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products')
      await GET(request)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('paginates correctly', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(100)

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products?page=3&limit=20')
      await GET(request)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3 - 1) * 20
          take: 20,
        })
      )
    })

    it('only returns active products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products')
      await GET(request)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      )
    })

    it('formats product response correctly', async () => {
      const product = createMockProduct({
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        _count: { reviews: 5, orderItems: 15 },
      })
      mockPrisma.product.findMany.mockResolvedValue([product])
      mockPrisma.product.count.mockResolvedValue(1)

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products')
      const response = await GET(request)
      const data = await response.json()

      expect(data.products[0]).toHaveProperty('id')
      expect(data.products[0]).toHaveProperty('name')
      expect(data.products[0]).toHaveProperty('slug')
      expect(data.products[0]).toHaveProperty('price')
      expect(data.products[0]).toHaveProperty('isNew')
      expect(data.products[0]).toHaveProperty('isBestseller')
      expect(data.products[0]).toHaveProperty('inStock')
    })

    it('returns the product real color hex codes (deduped), not a hardcoded swatch', async () => {
      const product = createMockProduct({
        colors: [
          { id: 'c1', name: 'Red', hexCode: '#FF0000', productId: 'p1' },
          { id: 'c2', name: 'Blue', hexCode: '#0000FF', productId: 'p1' },
          { id: 'c3', name: 'Red (dup)', hexCode: '#FF0000', productId: 'p1' },
        ],
      })
      mockPrisma.product.findMany.mockResolvedValue([product])
      mockPrisma.product.count.mockResolvedValue(1)

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products')
      const data = await (await GET(request)).json()

      expect(data.products[0].colors).toEqual(['#FF0000', '#0000FF'])
    })

    it('filters by color via a relation where-clause when colors param is present', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products?colors=%23FF0000,%230000FF')
      await GET(request)

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            colors: { some: { hexCode: { in: ['#FF0000', '#0000FF'] } } },
          }),
        })
      )
    })

    it('handles database errors', async () => {
      mockPrisma.product.count.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
    })
  })
})
