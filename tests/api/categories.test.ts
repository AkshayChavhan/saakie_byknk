import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockCategory, createMany } from '../mocks/factories'

// Mock Prisma
const mockPrisma = {
  category: {
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

describe('Categories API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/categories', () => {
    it('returns active categories', async () => {
      const categories = createMany(createMockCategory, 3, (index) => ({
        id: `cat_${index}`,
        name: `Category ${index}`,
        slug: `category-${index}`,
        _count: { products: index * 5 },
      }))
      mockPrisma.category.findMany.mockResolvedValue(categories)

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(3)
    })

    it('only returns active categories', async () => {
      mockPrisma.category.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/categories/route')
      await GET()

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      )
    })

    it('orders categories by name', async () => {
      mockPrisma.category.findMany.mockResolvedValue([])

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
        _count: { products: 10 },
      })
      mockPrisma.category.findMany.mockResolvedValue([category])

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

    it('uses placeholder image when category has no image', async () => {
      const category = createMockCategory({
        image: null,
        _count: { products: 5 },
      })
      mockPrisma.category.findMany.mockResolvedValue([category])

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].image).toBe('/images/placeholder-category.jpg')
    })

    it('includes product count', async () => {
      const category = createMockCategory({
        _count: { products: 25 },
      })
      mockPrisma.category.findMany.mockResolvedValue([category])

      const { GET } = await import('@/app/api/categories/route')
      const response = await GET()
      const data = await response.json()

      expect(data[0].count).toBe(25)
    })

    it('returns empty array when no categories', async () => {
      mockPrisma.category.findMany.mockResolvedValue([])

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
      expect(data.error).toBe('Internal server error')
    })
  })
})
