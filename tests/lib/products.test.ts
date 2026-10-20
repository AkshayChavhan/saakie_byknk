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

  it('loads the gallery in the admin\'s image sequence, main photo first', async () => {
    mockPrisma.product.findUnique.mockResolvedValue(createMockProduct({ _count: { reviews: 0 }, reviews: [] }))
    mockPrisma.product.findMany.mockResolvedValue([])
    const { loadProductDetail } = await import('@/lib/server/products')

    await loadProductDetail('ordered-saree')

    const order = [{ isPrimary: 'desc' }, { order: 'asc' }]
    expect(mockPrisma.product.findUnique.mock.calls[0][0].include.images).toEqual({ orderBy: order })
    // The related-product thumbnails follow the same order.
    expect(mockPrisma.product.findMany.mock.calls[0][0].select.images).toMatchObject({ take: 1, orderBy: order })
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
