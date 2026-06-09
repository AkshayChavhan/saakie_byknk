import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createMockUser,
  createMockOrder,
  createMockAddress,
  createMockCart,
  createMockCartItem,
  createMockProduct,
  createMockSession,
} from '../mocks/factories'

// Mock Auth.js — `auth()` resolves the session (or null when signed out).
// `requireAuth()` reads `session.user.id` then loads the user via Prisma.
const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// Mock Prisma. The order route builds an order from the signed-in user's cart,
// so we need `user.findUnique` (used by requireAuth), `cart.findUnique`, and
// `order.create` / `order.findMany`.
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  cart: {
    findUnique: vi.fn(),
  },
  order: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

// A cart with a single COD-eligible item, ready for a successful checkout.
function cartWithItem() {
  const product = createMockProduct({
    id: 'prod_123',
    price: 5999,
    paymentModes: ['COD', 'PREPAID'],
  })
  return createMockCart({
    items: [createMockCartItem({ quantity: 1, price: 5999, product })],
  })
}

// Sign the request in as `user_123` so requireAuth() resolves to a user.
function signIn() {
  mockAuth.mockResolvedValue(createMockSession({ id: 'user_123' }))
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_123' }))
}

describe('Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/orders', () => {
    const validOrderData = {
      shippingAddressId: 'addr_123',
      billingAddressId: 'addr_123',
      paymentMethod: 'COD',
    }

    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('creates an order from the user cart', async () => {
      signIn()
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItem())
      mockPrisma.order.create.mockResolvedValue({
        ...createMockOrder({ id: 'order_123', userId: 'user_123' }),
        items: [],
        shippingAddress: createMockAddress(),
      })

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
      expect(data.orderNumber).toBeDefined()
    })

    it('generates an order number with the ORD- prefix', async () => {
      signIn()
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItem())
      mockPrisma.order.create.mockImplementation(({ data }: { data: { orderNumber: string } }) =>
        Promise.resolve({
          ...createMockOrder({ orderNumber: data.orderNumber }),
          items: [],
          shippingAddress: createMockAddress(),
        })
      )

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(data.orderNumber).toMatch(/^ORD-/)
    })

    it('returns 400 when the cart is empty', async () => {
      signIn()
      mockPrisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }))

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cart is empty')
    })

    it('returns 409 when a product does not allow the chosen payment method', async () => {
      signIn()
      const product = createMockProduct({
        id: 'prod_123',
        name: 'Prepaid-only Saree',
        paymentModes: ['PREPAID'],
      })
      mockPrisma.cart.findUnique.mockResolvedValue(
        createMockCart({ items: [createMockCartItem({ product })] })
      )

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({ ...validOrderData, paymentMethod: 'COD' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(409)
    })

    it('computes the total from cart item prices server-side', async () => {
      signIn()
      const product = createMockProduct({ id: 'prod_123', price: 200, paymentModes: ['COD'] })
      mockPrisma.cart.findUnique.mockResolvedValue(
        createMockCart({ items: [createMockCartItem({ quantity: 2, product })] })
      )
      mockPrisma.order.create.mockResolvedValue({
        ...createMockOrder(),
        items: [],
        shippingAddress: createMockAddress(),
      })

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      await POST(request)

      // subtotal 400 (2 * 200) + 99 shipping (under the ₹999 free-shipping threshold)
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subtotal: 400, shipping: 99, total: 499 }),
        })
      )
    })

    it('handles database errors with a 500', async () => {
      signIn()
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItem())
      mockPrisma.order.create.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('GET /api/orders', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const { GET } = await import('@/app/api/orders/route')
      const response = await GET()

      expect(response.status).toBe(401)
    })

    it('returns the signed-in user orders', async () => {
      signIn()
      mockPrisma.order.findMany.mockResolvedValue([
        createMockOrder({ id: 'order_1' }),
        createMockOrder({ id: 'order_2' }),
      ])

      const { GET } = await import('@/app/api/orders/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)
    })

    it('scopes orders to the current user, newest first', async () => {
      signIn()
      mockPrisma.order.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/orders/route')
      await GET()

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_123' },
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('handles database errors with a 500', async () => {
      signIn()
      mockPrisma.order.findMany.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('@/app/api/orders/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
