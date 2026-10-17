import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSession, createMockUser } from '../../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

const mockPrisma = {
  user: { findUnique: vi.fn() },
  product: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn(), fields: { lowStockAlert: 'lowStockAlert' } },
  category: { findMany: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

const list = (query = '') =>
  new NextRequest(`http://localhost:3000/api/admin/products${query ? `?${query}` : ''}`)

describe('GET /api/admin/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(createMockSession({ id: 'admin_1' }))
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'admin_1', role: 'ADMIN' }))
    mockPrisma.product.findMany.mockResolvedValue([])
    // [0] filtered count, then total, active, low stock, out of stock
    mockPrisma.product.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(35)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
    mockPrisma.category.findMany.mockResolvedValue([
      { id: 'parent', parentId: null },
      { id: 'child', parentId: 'parent' },
    ])
  })

  it('paginates, filters and reports catalogue-wide stats', async () => {
    const { GET } = await import('@/app/api/admin/products/route')
    const response = await GET(list('page=2&limit=10&search=silk&status=low_stock'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.pagination).toEqual({ page: 2, limit: 10, totalCount: 3, totalPages: 1 })
    expect(body.stats).toEqual({ total: 40, active: 35, lowStock: 4, outOfStock: 2 })

    const { where, skip, take } = mockPrisma.product.findMany.mock.calls[0][0]
    expect(skip).toBe(10)
    expect(take).toBe(10)
    expect(where.OR[0]).toEqual({ name: { contains: 'silk', mode: 'insensitive' } })
    expect(where.stock).toEqual({ lte: 'lowStockAlert' })
  })

  it('scopes a category filter to the whole subtree', async () => {
    const { GET } = await import('@/app/api/admin/products/route')
    await GET(list('category=parent'))

    const { where } = mockPrisma.product.findMany.mock.calls[0][0]
    expect(where.categoryId).toEqual({ in: ['parent', 'child'] })
  })

  it('maps each status option onto a filter', async () => {
    const { GET } = await import('@/app/api/admin/products/route')
    const whereFor = async (status: string) => {
      mockPrisma.product.findMany.mockClear()
      mockPrisma.product.count.mockResolvedValue(0)
      await GET(list(`status=${status}`))
      return mockPrisma.product.findMany.mock.calls[0][0].where
    }
    expect(await whereFor('active')).toEqual({ isActive: true })
    expect(await whereFor('inactive')).toEqual({ isActive: false })
    expect(await whereFor('featured')).toEqual({ isFeatured: true })
    expect(await whereFor('out_of_stock')).toEqual({ stock: 0 })
    expect(await whereFor('all')).toEqual({})
  })

  it('refuses non-admins', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'u', role: 'USER' }))
    const { GET } = await import('@/app/api/admin/products/route')
    expect((await GET(list())).status).toBe(403)
  })
})
