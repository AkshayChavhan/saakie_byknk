import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockProduct } from '../mocks/factories'

const mockPrisma = {
  product: { findUnique: vi.fn(), findMany: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

describe('loadProductDetail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null for an unknown slug without looking for related products', async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null)
    const { loadProductDetail } = await import('@/lib/server/products')

    expect(await loadProductDetail('missing')).toBeNull()
    expect(mockPrisma.product.findMany).not.toHaveBeenCalled()
  })

  it('keeps internal numbers off the payload and reads the maintained rating', async () => {
    mockPrisma.product.findUnique.mockResolvedValue(
      createMockProduct({
        costPrice: 1200,
        lowStockAlert: 3,
        rating: 4.4,
        reviews: [],
        _count: { reviews: 7 },
      })
    )
    mockPrisma.product.findMany.mockResolvedValue([
      createMockProduct({ id: 'rel_1', slug: 'related', images: [] }),
    ])
    const { loadProductDetail } = await import('@/lib/server/products')

    const detail = await loadProductDetail('silk-saree')

    expect(detail).not.toHaveProperty('costPrice')
    expect(detail).not.toHaveProperty('lowStockAlert')
    expect(detail?.avgRating).toBe(4.4)
    expect(detail?.reviewCount).toBe(7)
    expect(detail?.inStock).toBe(true)
    expect(detail?.relatedProducts[0]).toMatchObject({
      slug: 'related',
      image: '/images/placeholder-product.svg',
    })
  })
})
