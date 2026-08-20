import { describe, it, expect, vi, beforeEach } from 'vitest'

// Public route: no session involved, it only runs two count queries through
// the default Prisma export. `product.fields.price` is the field reference
// the sale filter compares against, so the mock carries a sentinel for it.
const priceFieldRef = { modelName: 'Product', name: 'price' }
const mockPrisma = {
  product: {
    count: vi.fn(),
    fields: { price: priceFieldRef },
  },
  blogPost: {
    count: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

const get = async () => {
  const { GET } = await import('@/app/api/nav-counts/route')
  return GET()
}

describe('Nav Counts API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.product.count.mockResolvedValue(0)
    mockPrisma.blogPost.count.mockResolvedValue(0)
  })

  describe('GET /api/nav-counts', () => {
    it('returns both counts as zero on an empty store', async () => {
      const response = await get()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ sale: 0, blog: 0 })
    })

    it('returns the live counts', async () => {
      mockPrisma.product.count.mockResolvedValue(4)
      mockPrisma.blogPost.count.mockResolvedValue(2)

      const data = await (await get()).json()

      expect(data).toEqual({ sale: 4, blog: 2 })
    })

    it('counts only active products genuinely marked down', async () => {
      // Must match the `?sale=true` listing filter exactly, or the tab could
      // show for products the listing then refuses to display.
      await get()

      expect(mockPrisma.product.count).toHaveBeenCalledWith({
        where: {
          isActive: true,
          comparePrice: { gt: priceFieldRef },
        },
      })
    })

    it('counts only published blog posts', async () => {
      await get()

      expect(mockPrisma.blogPost.count).toHaveBeenCalledWith({
        where: { isPublished: true },
      })
    })

    it('handles database errors with a 500', async () => {
      mockPrisma.product.count.mockRejectedValue(new Error('Database error'))

      const response = await get()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
