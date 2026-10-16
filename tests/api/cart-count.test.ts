import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSession, createMockUser } from '../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

const mockPrisma = {
  user: { findUnique: vi.fn() },
  cartItem: { aggregate: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

describe('GET /api/cart/count', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when signed out', async () => {
    mockAuth.mockResolvedValue(null)
    const { GET } = await import('@/app/api/cart/count/route')
    expect((await GET()).status).toBe(401)
  })

  it('sums the quantities with one aggregate instead of loading the cart', async () => {
    mockAuth.mockResolvedValue(createMockSession({ id: 'user_123' }))
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_123' }))
    mockPrisma.cartItem.aggregate.mockResolvedValue({ _sum: { quantity: 7 } })

    const { GET } = await import('@/app/api/cart/count/route')
    const response = await GET()

    expect(await response.json()).toEqual({ itemCount: 7 })
    expect(mockPrisma.cartItem.aggregate).toHaveBeenCalledWith({
      where: { cart: { userId: 'user_123' } },
      _sum: { quantity: true },
    })
  })

  it('reports 0 for an empty or missing cart', async () => {
    mockAuth.mockResolvedValue(createMockSession({ id: 'user_123' }))
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_123' }))
    mockPrisma.cartItem.aggregate.mockResolvedValue({ _sum: { quantity: null } })

    const { GET } = await import('@/app/api/cart/count/route')
    expect(await (await GET()).json()).toEqual({ itemCount: 0 })
  })
})
