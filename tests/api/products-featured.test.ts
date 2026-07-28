import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockProduct, createMany } from '../mocks/factories'

// Mock Prisma
const mockPrisma = {
  product: {
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
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

    it('reports a rating when the product has reviews', async () => {
      const product = createMockProduct({
        _count: { reviews: 3 },
      })
      mockPrisma.product.findMany.mockResolvedValue([product])

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      // The route surfaces a flat 4.5 when any reviews exist (no averaging).
      expect(data[0].rating).toBe(4.5)
      expect(data[0].reviews).toBe(3)
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

    it('reports in-stock status from the product stock', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        createMockProduct({ stock: 5, _count: { reviews: 0 } }),
      ])

      const { GET } = await import('@/app/api/products/featured/route')
      const data = await (await GET()).json()

      expect(data[0].inStock).toBe(true)
    })

    it('reports out-of-stock when stock is zero', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        createMockProduct({ stock: 0, _count: { reviews: 0 } }),
      ])

      const { GET } = await import('@/app/api/products/featured/route')
      const data = await (await GET()).json()

      expect(data[0].inStock).toBe(false)
    })

    it('uses placeholder image when no images', async () => {
      const productNoImages = createMockProduct({
        images: [],
        _count: { reviews: 0 },
      })
      mockPrisma.product.findMany.mockResolvedValue([productNoImages])

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].image).toBe('/images/placeholder-product.svg')
    })

    it('keeps compare price null when not set, so no discount is implied', async () => {
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

      // A product with no admin-set compare price is NOT on sale. Deriving one
      // from the selling price (e.g. price * 1.3) invents a discount that never
      // existed — every product would advertise the same fake percentage.
      expect(data[0].comparePrice).toBeNull()
    })

    it('passes through a real compare price unchanged', async () => {
      const discountedProduct = createMockProduct({
        price: 1000,
        comparePrice: 1500,
        reviews: [],
        _count: { reviews: 0 },
      })
      mockPrisma.product.findMany.mockResolvedValue([discountedProduct])

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].comparePrice).toBe(1500)
    })

    it('handles database errors', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('@/app/api/products/featured/route')
      const response = await GET()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
    })
  })
})
