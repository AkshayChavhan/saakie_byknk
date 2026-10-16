import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  cart: { findUnique: vi.fn(), create: vi.fn() },
  cartItem: { aggregate: vi.fn() },
  wishlist: { findUnique: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

describe('loadCart', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the cart with totals in the API shape', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue({
      id: 'cart_1',
      userId: 'user_1',
      items: [
        { id: 'a', price: 100, quantity: 2 },
        { id: 'b', price: 50, quantity: 1 },
      ],
    })
    const { loadCart } = await import('@/lib/server/cart')

    const cart = await loadCart('user_1')

    expect(cart).toMatchObject({ id: 'cart_1', subtotal: 250, itemCount: 3 })
    expect(mockPrisma.cart.create).not.toHaveBeenCalled()
  })

  it('creates the cart on first use, as GET /api/cart does', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue(null)
    mockPrisma.cart.create.mockResolvedValue({ id: 'cart_new', userId: 'user_1', items: [] })
    const { loadCart } = await import('@/lib/server/cart')

    const cart = await loadCart('user_1')

    expect(cart).toMatchObject({ id: 'cart_new', subtotal: 0, itemCount: 0 })
    expect(mockPrisma.cart.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: 'user_1' } })
    )
  })
})

describe('loadWishlistItems', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the items, or an empty list when the user has no wishlist yet', async () => {
    const { loadWishlistItems } = await import('@/lib/server/wishlist')

    mockPrisma.wishlist.findUnique.mockResolvedValueOnce({ id: 'w', items: [{ id: 'i1' }] })
    expect(await loadWishlistItems('user_1')).toEqual([{ id: 'i1' }])

    mockPrisma.wishlist.findUnique.mockResolvedValueOnce(null)
    expect(await loadWishlistItems('user_1')).toEqual([])
  })
})
