import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { createMockProduct, createMockCategory, createMany } from '../mocks/factories'

// Mock Prisma
const mockPrisma = {
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  category: {
    findUnique: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

describe('Products API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    it('handles database errors', async () => {
      mockPrisma.product.count.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('@/app/api/products/route')
      const request = new NextRequest('http://localhost:3000/api/products')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })
})
