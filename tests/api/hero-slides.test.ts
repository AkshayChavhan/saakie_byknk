import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockProduct, createMockCategory } from '../mocks/factories'

// Mock Prisma
const mockPrisma = {
  product: {
    findMany: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
  },
  $disconnect: vi.fn(),
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}))

describe('Hero Slides API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/hero-slides', () => {
    it('returns slides with bestseller product', async () => {
      const topProduct = createMockProduct({
        name: 'Best Saree',
        slug: 'best-saree',
        price: 5999,
        orderItems: [{ quantity: 10 }, { quantity: 5 }],
        images: [{ url: 'https://example.com/image.jpg', isPrimary: true }],
        category: createMockCategory({ name: 'Sarees' }),
      })
      mockPrisma.product.findMany
        .mockResolvedValueOnce([topProduct]) // top selling
        .mockResolvedValueOnce([]) // sale
        .mockResolvedValueOnce([]) // featured
      mockPrisma.category.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      expect(data.slides).toBeDefined()
      expect(data.slides.some((s: { type: string }) => s.type === 'bestseller')).toBe(true)
    })

    it('returns slides with sale products', async () => {
      const saleProduct = createMockProduct({
        name: 'Sale Saree',
        price: 3999,
        comparePrice: 5999,
        images: [{ url: 'https://example.com/sale.jpg', isPrimary: true }],
        category: createMockCategory({ name: 'Sarees', slug: 'sarees' }),
      })
      mockPrisma.product.findMany
        .mockResolvedValueOnce([]) // top selling
        .mockResolvedValueOnce([saleProduct]) // sale
        .mockResolvedValueOnce([]) // featured
      mockPrisma.category.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      expect(data.slides.some((s: { type: string }) => s.type === 'sale')).toBe(true)
    })

    it('returns slides with featured products', async () => {
      const featuredProduct = createMockProduct({
        name: 'Featured Saree',
        isFeatured: true,
        images: [{ url: 'https://example.com/featured.jpg', isPrimary: true }],
        category: createMockCategory({ name: 'Silk', slug: 'silk' }),
      })
      mockPrisma.product.findMany
        .mockResolvedValueOnce([]) // top selling
        .mockResolvedValueOnce([]) // sale
        .mockResolvedValueOnce([featuredProduct]) // featured
      mockPrisma.category.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      expect(data.slides.some((s: { type: string }) => s.type === 'featured')).toBe(true)
    })

    it('returns category spotlight slide', async () => {
      mockPrisma.product.findMany
        .mockResolvedValueOnce([]) // top selling
        .mockResolvedValueOnce([]) // sale
        .mockResolvedValueOnce([]) // featured
      mockPrisma.category.findMany.mockResolvedValue([
        { ...createMockCategory({ name: 'Sarees', slug: 'sarees' }), _count: { products: 50 } },
      ])

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      expect(data.slides.some((s: { type: string }) => s.type === 'category')).toBe(true)
    })

    it('returns default slides when no products exist', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.category.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      expect(data.slides.length).toBeGreaterThan(0)
      expect(data.slides[0].type).toBe('default')
    })

    it('calculates discount percentage correctly', async () => {
      const saleProduct = createMockProduct({
        price: 3000, // 40% off
        comparePrice: 5000,
        images: [{ url: 'https://example.com/sale.jpg', isPrimary: true }],
        category: createMockCategory({ name: 'Sarees', slug: 'sarees' }),
      })
      mockPrisma.product.findMany
        .mockResolvedValueOnce([]) // top selling
        .mockResolvedValueOnce([saleProduct]) // sale
        .mockResolvedValueOnce([]) // featured
      mockPrisma.category.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      const saleSlide = data.slides.find((s: { type: string }) => s.type === 'sale')
      expect(saleSlide.discount).toBe(40)
    })

    it('returns stats with response', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.category.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      expect(data.stats).toBeDefined()
      expect(data.stats).toHaveProperty('totalProducts')
      expect(data.stats).toHaveProperty('saleProducts')
      expect(data.stats).toHaveProperty('featuredProducts')
      expect(data.stats).toHaveProperty('categories')
    })

    it('handles database errors with fallback slides', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200) // Returns fallback instead of error
      expect(data.slides).toBeDefined()
      expect(data.slides.length).toBeGreaterThan(0)
    })

    it('disconnects from database after query', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.category.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/hero-slides/route')
      await GET()

      expect(mockPrisma.$disconnect).toHaveBeenCalled()
    })

    it('uses placeholder image when product has no images', async () => {
      const productNoImage = createMockProduct({
        images: [],
        orderItems: [{ quantity: 10 }],
        category: createMockCategory(),
      })
      mockPrisma.product.findMany
        .mockResolvedValueOnce([productNoImage]) // top selling
        .mockResolvedValueOnce([]) // sale
        .mockResolvedValueOnce([]) // featured
      mockPrisma.category.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      const bestsellerSlide = data.slides.find((s: { type: string }) => s.type === 'bestseller')
      expect(bestsellerSlide.image).toBe('/images/hero-1.jpg')
    })

    it('sorts products by sales volume', async () => {
      const lowSalesProduct = createMockProduct({
        name: 'Low Sales',
        orderItems: [{ quantity: 2 }],
        images: [{ url: 'https://example.com/low.jpg', isPrimary: true }],
        category: createMockCategory(),
      })
      const highSalesProduct = createMockProduct({
        name: 'High Sales',
        orderItems: [{ quantity: 50 }, { quantity: 30 }],
        images: [{ url: 'https://example.com/high.jpg', isPrimary: true }],
        category: createMockCategory(),
      })
      mockPrisma.product.findMany
        .mockResolvedValueOnce([lowSalesProduct, highSalesProduct]) // top selling
        .mockResolvedValueOnce([]) // sale
        .mockResolvedValueOnce([]) // featured
      mockPrisma.category.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      const bestsellerSlide = data.slides.find((s: { type: string }) => s.type === 'bestseller')
      expect(bestsellerSlide.product.name).toBe('High Sales')
    })
  })
})
