import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrismaClient, resetPrismaMocks } from '../mocks/prisma'
import { createMockCart, createMockCartItem, createMockProduct } from '../mocks/factories'

// Mock the db module
vi.mock('@/lib/db', () => ({
  prisma: mockPrismaClient,
}))

describe('cart utilities', () => {
  beforeEach(() => {
    resetPrismaMocks()
  })

  describe('validateCart', () => {
    it('returns invalid when cart is empty', async () => {
      mockPrismaClient.cart.findUnique.mockResolvedValue(null)

      const { validateCart } = await import('@/lib/cart')
      const result = await validateCart('user_123')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Cart is empty')
    })

    it('returns invalid when cart has no items', async () => {
      mockPrismaClient.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }))

      const { validateCart } = await import('@/lib/cart')
      const result = await validateCart('user_123')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Cart is empty')
    })

    it('returns valid for active products with sufficient stock', async () => {
      const product = createMockProduct({ stock: 10, isActive: true })
      const cartItem = createMockCartItem({ quantity: 2, product })
      mockPrismaClient.cart.findUnique.mockResolvedValue(
        createMockCart({ items: [cartItem] })
      )

      const { validateCart } = await import('@/lib/cart')
      const result = await validateCart('user_123')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns invalid for inactive products', async () => {
      const product = createMockProduct({ stock: 10, isActive: false, name: 'Inactive Saree' })
      const cartItem = createMockCartItem({ quantity: 2, product })
      mockPrismaClient.cart.findUnique.mockResolvedValue(
        createMockCart({ items: [cartItem] })
      )

      const { validateCart } = await import('@/lib/cart')
      const result = await validateCart('user_123')

      expect(result.isValid).toBe(false)
      expect(result.unavailableItems).toContain('Inactive Saree')
      expect(result.errors).toContain('Inactive Saree is no longer available')
    })

    it('returns invalid for insufficient stock', async () => {
      const product = createMockProduct({ stock: 2, isActive: true, name: 'Limited Saree', id: 'prod_123' })
      const cartItem = createMockCartItem({ quantity: 5, product })
      mockPrismaClient.cart.findUnique.mockResolvedValue(
        createMockCart({ items: [cartItem] })
      )

      const { validateCart } = await import('@/lib/cart')
      const result = await validateCart('user_123')

      expect(result.isValid).toBe(false)
      expect(result.insufficientStockItems).toHaveLength(1)
      expect(result.insufficientStockItems[0]).toEqual({
        productId: 'prod_123',
        requested: 5,
        available: 2,
      })
      expect(result.errors).toContain('Only 2 units of Limited Saree available')
    })

    it('handles database errors gracefully', async () => {
      mockPrismaClient.cart.findUnique.mockRejectedValue(new Error('DB Error'))

      const { validateCart } = await import('@/lib/cart')
      const result = await validateCart('user_123')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Failed to validate cart')
    })
  })

  describe('updateCartItemPrices', () => {
    it('updates prices when they differ', async () => {
      const product = createMockProduct({ price: 6999 })
      const cartItem = createMockCartItem({ id: 'item_1', price: 5999, product })
      mockPrismaClient.cart.findUnique.mockResolvedValue(
        createMockCart({ items: [cartItem] })
      )
      mockPrismaClient.cartItem.update.mockResolvedValue({})

      const { updateCartItemPrices } = await import('@/lib/cart')
      await updateCartItemPrices('user_123')

      expect(mockPrismaClient.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item_1' },
        data: { price: 6999 },
      })
    })

    it('does not update prices when they match', async () => {
      const product = createMockProduct({ price: 5999 })
      const cartItem = createMockCartItem({ price: 5999, product })
      mockPrismaClient.cart.findUnique.mockResolvedValue(
        createMockCart({ items: [cartItem] })
      )

      const { updateCartItemPrices } = await import('@/lib/cart')
      await updateCartItemPrices('user_123')

      expect(mockPrismaClient.cartItem.update).not.toHaveBeenCalled()
    })

    it('does nothing when cart not found', async () => {
      mockPrismaClient.cart.findUnique.mockResolvedValue(null)

      const { updateCartItemPrices } = await import('@/lib/cart')
      await updateCartItemPrices('user_123')

      expect(mockPrismaClient.cartItem.update).not.toHaveBeenCalled()
    })
  })

  describe('calculateCartTotals', () => {
    it('calculates correct totals', async () => {
      const items = [
        createMockCartItem({ price: 5999, quantity: 2, product: createMockProduct({ price: 5999 }) }),
        createMockCartItem({ price: 3999, quantity: 1, product: createMockProduct({ price: 3999 }) }),
      ]
      mockPrismaClient.cart.findUnique.mockResolvedValue(
        createMockCart({ items })
      )

      const { calculateCartTotals } = await import('@/lib/cart')
      const result = await calculateCartTotals('user_123')

      expect(result.subtotal).toBe(15997) // (5999 * 2) + (3999 * 1)
      expect(result.itemCount).toBe(3) // 2 + 1
      expect(result.items).toHaveLength(2)
    })

    it('returns zero totals when cart not found', async () => {
      mockPrismaClient.cart.findUnique.mockResolvedValue(null)

      const { calculateCartTotals } = await import('@/lib/cart')
      const result = await calculateCartTotals('user_123')

      expect(result.subtotal).toBe(0)
      expect(result.itemCount).toBe(0)
      expect(result.items).toHaveLength(0)
    })

    it('returns zero totals for empty cart', async () => {
      mockPrismaClient.cart.findUnique.mockResolvedValue(
        createMockCart({ items: [] })
      )

      const { calculateCartTotals } = await import('@/lib/cart')
      const result = await calculateCartTotals('user_123')

      expect(result.subtotal).toBe(0)
      expect(result.itemCount).toBe(0)
    })
  })

  describe('clearExpiredCartItems', () => {
    it('deletes items for inactive products', async () => {
      mockPrismaClient.cartItem.deleteMany.mockResolvedValue({ count: 2 })
      mockPrismaClient.cartItem.findMany.mockResolvedValue([])

      const { clearExpiredCartItems } = await import('@/lib/cart')
      await clearExpiredCartItems()

      expect(mockPrismaClient.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { product: { isActive: false } },
      })
    })

    it('removes items completely when stock is zero', async () => {
      mockPrismaClient.cartItem.deleteMany.mockResolvedValue({ count: 0 })
      mockPrismaClient.cartItem.findMany.mockResolvedValue([
        { id: 'item_1', quantity: 5, product: { stock: 0 } },
      ])
      mockPrismaClient.cartItem.delete.mockResolvedValue({})

      const { clearExpiredCartItems } = await import('@/lib/cart')
      await clearExpiredCartItems()

      expect(mockPrismaClient.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item_1' },
      })
    })

    it('reduces quantity when stock is less than requested', async () => {
      mockPrismaClient.cartItem.deleteMany.mockResolvedValue({ count: 0 })
      mockPrismaClient.cartItem.findMany.mockResolvedValue([
        { id: 'item_1', quantity: 5, product: { stock: 2 } },
      ])
      mockPrismaClient.cartItem.update.mockResolvedValue({})

      const { clearExpiredCartItems } = await import('@/lib/cart')
      await clearExpiredCartItems()

      expect(mockPrismaClient.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item_1' },
        data: { quantity: 2 },
      })
    })

    it('does not modify items with sufficient stock', async () => {
      mockPrismaClient.cartItem.deleteMany.mockResolvedValue({ count: 0 })
      mockPrismaClient.cartItem.findMany.mockResolvedValue([
        { id: 'item_1', quantity: 2, product: { stock: 10 } },
      ])

      const { clearExpiredCartItems } = await import('@/lib/cart')
      await clearExpiredCartItems()

      expect(mockPrismaClient.cartItem.delete).not.toHaveBeenCalled()
      expect(mockPrismaClient.cartItem.update).not.toHaveBeenCalled()
    })
  })
})
