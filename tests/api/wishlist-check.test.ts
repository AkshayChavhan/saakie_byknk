import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSession, createMockUser } from '../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

const mockPrisma = {
  user: { findUnique: vi.fn() },
  wishlistItem: { count: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

const PRODUCT = '507f1f77bcf86cd799439011'
const req = (productId: string) =>
  new NextRequest(`http://localhost:3000/api/wishlist/check?productId=${productId}`)

describe('GET /api/wishlist/check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(createMockSession({ id: 'user_123' }))
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_123' }))
  })

  it('returns 401 when signed out', async () => {
    mockAuth.mockResolvedValue(null)
    const { GET } = await import('@/app/api/wishlist/check/route')
    expect((await GET(req(PRODUCT))).status).toBe(401)
  })

  it('answers with one count scoped to the user, not the whole list', async () => {
    mockPrisma.wishlistItem.count.mockResolvedValue(1)
    const { GET } = await import('@/app/api/wishlist/check/route')

    const response = await GET(req(PRODUCT))

    expect(await response.json()).toEqual({ inWishlist: true })
    expect(mockPrisma.wishlistItem.count).toHaveBeenCalledWith({
      where: { productId: PRODUCT, wishlist: { userId: 'user_123' } },
    })
  })

  it('rejects a missing or malformed product id', async () => {
    const { GET } = await import('@/app/api/wishlist/check/route')
    expect((await GET(req('nope'))).status).toBe(400)
    expect(mockPrisma.wishlistItem.count).not.toHaveBeenCalled()
  })
})
