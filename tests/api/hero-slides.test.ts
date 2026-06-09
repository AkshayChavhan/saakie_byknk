import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockProduct, createMockHeroSlide } from '../mocks/factories'

// The route reads the singleton client from `@/lib/prisma` (default export).
const mockPrisma = {
  heroSlide: {
    findMany: vi.fn(),
  },
  product: {
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

// Build a product the fallback can turn into a slide (needs an image url).
function product(overrides = {}) {
  return createMockProduct({
    images: [{ url: 'https://example.com/p.jpg' }],
    _count: { reviews: 0, orderItems: 0 },
    ...overrides,
  })
}

describe('Hero Slides API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no admin-managed slides, so tests exercise the product fallback.
    mockPrisma.heroSlide.findMany.mockResolvedValue([])
    mockPrisma.product.findMany.mockResolvedValue([])
  })

  describe('GET /api/hero-slides', () => {
    it('returns admin-managed hero slides when they exist', async () => {
      const slides = [createMockHeroSlide({ id: 'slide_1', order: 1 })]
      mockPrisma.heroSlide.findMany.mockResolvedValue(slides)

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data[0].id).toBe('slide_1')
      // Product fallback must not run when admin slides exist.
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled()
    })

    it('only requests active slides, ordered ascending', async () => {
      const { GET } = await import('@/app/api/hero-slides/route')
      await GET()

      expect(mockPrisma.heroSlide.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { order: 'asc' },
        })
      )
    })

    it('falls back to product-derived slides when no admin slides exist', async () => {
      mockPrisma.product.findMany.mockResolvedValue([product({ id: 'p1', name: 'Featured Saree' })])

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].title).toBe('Featured Saree')
      expect(data[0].ctaLink).toBe('/products/silk-saree')
    })

    it('marks a discounted product as a sale slide', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        product({ price: 500, comparePrice: 1000 }),
      ])

      const { GET } = await import('@/app/api/hero-slides/route')
      const data = await (await GET()).json()

      expect(data[0].type).toBe('sale')
      expect(data[0].badge).toBe('50% OFF')
      expect(data[0].discount).toBe(50)
    })

    it('marks a high-selling product as a bestseller slide', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        product({ price: 500, comparePrice: null, _count: { reviews: 0, orderItems: 11 } }),
      ])

      const { GET } = await import('@/app/api/hero-slides/route')
      const data = await (await GET()).json()

      expect(data[0].type).toBe('bestseller')
      expect(data[0].badge).toBe('Bestseller')
    })

    it('marks a plain featured product as a featured slide', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        product({ price: 500, comparePrice: null, isFeatured: true }),
      ])

      const { GET } = await import('@/app/api/hero-slides/route')
      const data = await (await GET()).json()

      expect(data[0].type).toBe('featured')
      expect(data[0].badge).toBe('Featured')
    })

    it('skips products that have no image', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        createMockProduct({ images: [], _count: { reviews: 0, orderItems: 0 } }),
      ])

      const { GET } = await import('@/app/api/hero-slides/route')
      const data = await (await GET()).json()

      expect(data).toEqual([])
    })

    it('returns an empty array when there are no slides or products', async () => {
      const { GET } = await import('@/app/api/hero-slides/route')
      const data = await (await GET()).json()

      expect(data).toEqual([])
    })

    it('handles database errors with a 500', async () => {
      mockPrisma.heroSlide.findMany.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('@/app/api/hero-slides/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
