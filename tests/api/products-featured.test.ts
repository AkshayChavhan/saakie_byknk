import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockProduct, createMany } from '../mocks/factories'

// Mock Prisma
const mockPrisma = {
  product: {
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

describe('Featured Products API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/products/featured', () => {
    it('returns featured products', async () => {
      const products = createMany(createMockProduct, 4, (index) => ({
        id: `product_${index}`,
        name: `Featured Product ${index}`,
        isFeatured: true,
        reviews: [{ rating: 5 }, { rating: 4 }],
        colors: [{ name: 'Red', hexCode: '#FF0000' }],
        _count: { reviews: 2 },
      }))
      mockPrisma.product.findMany.mockResolvedValue(products)

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeLessThanOrEqual(8)
    })

    it('only returns active and featured products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/products/featured/route')
      await GET()

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            isFeatured: true,
          },
        })
      )
    })

    it('limits to 8 products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/products/featured/route')
      await GET()

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 8,
        })
      )
    })

    it('orders by newest first', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/products/featured/route')
      await GET()

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('calculates average rating correctly', async () => {
      const product = createMockProduct({
        reviews: [{ rating: 5 }, { rating: 4 }, { rating: 3 }],
        _count: { reviews: 3 },
      })
      mockPrisma.product.findMany.mockResolvedValue([product])

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].rating).toBe(4) // (5 + 4 + 3) / 3 = 4
    })

    it('returns 0 rating when no reviews', async () => {
      const product = createMockProduct({
        reviews: [],
        _count: { reviews: 0 },
      })
      mockPrisma.product.findMany.mockResolvedValue([product])

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].rating).toBe(0)
    })

    it('marks product as new if created within 30 days', async () => {
      const newProduct = createMockProduct({
        createdAt: new Date(), // Today
        reviews: [],
        _count: { reviews: 0 },
      })
      mockPrisma.product.findMany.mockResolvedValue([newProduct])

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].isNew).toBe(true)
    })

    it('marks product as not new if created over 30 days ago', async () => {
      const oldProduct = createMockProduct({
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        reviews: [],
        _count: { reviews: 0 },
      })
      mockPrisma.product.findMany.mockResolvedValue([oldProduct])

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].isNew).toBe(false)
    })

    it('marks product as bestseller if has 50+ reviews and 4.5+ rating', async () => {
      const bestseller = createMockProduct({
        reviews: Array.from({ length: 51 }, () => ({ rating: 5 })),
        _count: { reviews: 51 },
      })
      mockPrisma.product.findMany.mockResolvedValue([bestseller])

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].isBestseller).toBe(true)
    })

    it('uses placeholder image when no images', async () => {
      const productNoImages = createMockProduct({
        images: [],
        reviews: [],
        _count: { reviews: 0 },
      })
      mockPrisma.product.findMany.mockResolvedValue([productNoImages])

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].image).toBe('/images/placeholder-product.jpg')
    })

    it('uses default compare price when not set', async () => {
      const productNoComparePrice = createMockProduct({
        price: 1000,
        comparePrice: null,
        reviews: [],
        _count: { reviews: 0 },
      })
      mockPrisma.product.findMany.mockResolvedValue([productNoComparePrice])

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].comparePrice).toBe(1300) // 1000 * 1.3
    })

    it('extracts color hex codes', async () => {
      const product = createMockProduct({
        colors: [
          { name: 'Red', hexCode: '#FF0000' },
          { name: 'Blue', hexCode: '#0000FF' },
        ],
        reviews: [],
        _count: { reviews: 0 },
      })
      mockPrisma.product.findMany.mockResolvedValue([product])

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].colors).toEqual(['#FF0000', '#0000FF'])
    })

    it('uses default color when hex code is missing', async () => {
      const product = createMockProduct({
        colors: [{ name: 'Unknown', hexCode: null }],
        reviews: [],
        _count: { reviews: 0 },
      })
      mockPrisma.product.findMany.mockResolvedValue([product])

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].colors).toContain('#000000')
    })

    it('handles database errors', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })
  })
})
