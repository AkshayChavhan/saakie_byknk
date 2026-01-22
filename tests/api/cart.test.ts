import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockUser, createMockCart, createMockCartItem, createMockProduct } from '../mocks/factories'

// Mock Clerk auth
const mockAuth = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}))

// Mock Prisma
const mockDb = {
  user: {
    findUnique: vi.fn(),
  },
  cart: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  cartItem: {
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  product: {
    findUnique: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({
  prisma: mockDb,
}))

describe('Cart API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/cart', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const { GET } = await import('@/app/api/cart/route')
      const response = await GET()

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 404 when user not found', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(null)

      const { GET } = await import('@/app/api/cart/route')
      const response = await GET()

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('User not found')
    })

    it('returns existing cart with items', async () => {
      const user = createMockUser()
      const cartItems = [
        createMockCartItem({ price: 5999, quantity: 2 }),
        createMockCartItem({ price: 3999, quantity: 1 }),
      ]
      const cart = createMockCart({ items: cartItems })

      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(user)
      mockDb.cart.findUnique.mockResolvedValue(cart)

      const { GET } = await import('@/app/api/cart/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.subtotal).toBe(15997) // (5999 * 2) + (3999 * 1)
      expect(data.itemCount).toBe(3)
    })

    it('creates cart if user does not have one', async () => {
      const user = createMockUser()
      const newCart = createMockCart({ items: [] })

      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(user)
      mockDb.cart.findUnique.mockResolvedValue(null)
      mockDb.cart.create.mockResolvedValue(newCart)

      const { GET } = await import('@/app/api/cart/route')
      const response = await GET()
      const data = await response.json()

      expect(mockDb.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: user.id },
        })
      )
      expect(data.subtotal).toBe(0)
      expect(data.itemCount).toBe(0)
    })

    it('handles database errors', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockRejectedValue(new Error('DB Error'))

      const { GET } = await import('@/app/api/cart/route')
      const response = await GET()

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/cart', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const { POST } = await import('@/app/api/cart/route')
      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod_123' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('returns 400 when productId is missing', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(createMockUser())

      const { POST } = await import('@/app/api/cart/route')
      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Product ID is required')
    })

    it('returns 400 when quantity is less than 1', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(createMockUser())

      const { POST } = await import('@/app/api/cart/route')
      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod_123', quantity: 0 }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Quantity must be at least 1')
    })

    it('returns 404 when product not found', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(createMockUser())
      mockDb.product.findUnique.mockResolvedValue(null)

      const { POST } = await import('@/app/api/cart/route')
      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod_123' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Product not found')
    })

    it('returns 400 when product is inactive', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(createMockUser())
      mockDb.product.findUnique.mockResolvedValue(
        createMockProduct({ isActive: false })
      )

      const { POST } = await import('@/app/api/cart/route')
      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod_123' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Product is not available')
    })

    it('returns 400 when insufficient stock', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(createMockUser())
      mockDb.product.findUnique.mockResolvedValue(
        createMockProduct({ stock: 2, isActive: true })
      )

      const { POST } = await import('@/app/api/cart/route')
      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod_123', quantity: 5 }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Only 2 items available')
    })

    it('adds new item to cart', async () => {
      const user = createMockUser()
      const product = createMockProduct({ stock: 10, price: 5999 })
      const cart = createMockCart({ items: [] })
      const updatedCart = createMockCart({
        items: [createMockCartItem({ price: 5999, quantity: 1 })],
      })

      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(user)
      mockDb.product.findUnique.mockResolvedValue(product)
      mockDb.cart.findUnique
        .mockResolvedValueOnce(cart)
        .mockResolvedValueOnce(updatedCart)
      mockDb.cartItem.create.mockResolvedValue({})

      const { POST } = await import('@/app/api/cart/route')
      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod_123', quantity: 1 }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockDb.cartItem.create).toHaveBeenCalled()
    })

    it('updates existing item quantity', async () => {
      const user = createMockUser()
      const product = createMockProduct({ stock: 10, price: 5999, id: 'prod_123' })
      const existingItem = createMockCartItem({
        id: 'item_123',
        productId: 'prod_123',
        quantity: 2,
      })
      const cart = createMockCart({ items: [existingItem] })
      const updatedCart = createMockCart({
        items: [{ ...existingItem, quantity: 3 }],
      })

      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(user)
      mockDb.product.findUnique.mockResolvedValue(product)
      mockDb.cart.findUnique
        .mockResolvedValueOnce(cart)
        .mockResolvedValueOnce(updatedCart)
      mockDb.cartItem.update.mockResolvedValue({})

      const { POST } = await import('@/app/api/cart/route')
      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod_123', quantity: 1 }),
      })
      await POST(request)

      expect(mockDb.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item_123' },
        data: { quantity: 3, price: 5999 },
      })
    })

    it('creates cart if does not exist when adding item', async () => {
      const user = createMockUser()
      const product = createMockProduct({ stock: 10 })
      const newCart = createMockCart({ items: [] })
      const updatedCart = createMockCart({
        items: [createMockCartItem()],
      })

      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(user)
      mockDb.product.findUnique.mockResolvedValue(product)
      mockDb.cart.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(updatedCart)
      mockDb.cart.create.mockResolvedValue(newCart)
      mockDb.cartItem.create.mockResolvedValue({})

      const { POST } = await import('@/app/api/cart/route')
      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: 'prod_123' }),
      })
      await POST(request)

      expect(mockDb.cart.create).toHaveBeenCalled()
    })
  })

  describe('DELETE /api/cart', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const { DELETE } = await import('@/app/api/cart/route')
      const response = await DELETE()

      expect(response.status).toBe(401)
    })

    it('clears all items from cart', async () => {
      const user = createMockUser()

      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(user)
      mockDb.cartItem.deleteMany.mockResolvedValue({ count: 3 })

      const { DELETE } = await import('@/app/api/cart/route')
      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Cart cleared successfully')
      expect(mockDb.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cart: { userId: user.id } },
      })
    })

    it('returns 404 when user not found', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockDb.user.findUnique.mockResolvedValue(null)

      const { DELETE } = await import('@/app/api/cart/route')
      const response = await DELETE()

      expect(response.status).toBe(404)
    })
  })
})
