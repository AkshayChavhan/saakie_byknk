import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  review: { aggregate: vi.fn() },
  product: { update: vi.fn() },
  order: { count: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

describe('syncProductRating', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores the average of approved reviews on the product', async () => {
    mockPrisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.333 } })
    const { syncProductRating } = await import('@/lib/server/reviews')

    const rating = await syncProductRating('prod_1')

    expect(mockPrisma.review.aggregate).toHaveBeenCalledWith({
      where: { productId: 'prod_1', status: 'APPROVED' },
      _avg: { rating: true },
    })
    expect(rating).toBe(4.33)
    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 'prod_1' },
      data: { rating: 4.33 },
    })
  })

  it('resets to 0 when the last approved review is gone', async () => {
    mockPrisma.review.aggregate.mockResolvedValue({ _avg: { rating: null } })
    const { syncProductRating } = await import('@/lib/server/reviews')
    expect(await syncProductRating('prod_1')).toBe(0)
  })
})
