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
  address: {
    // Used by verifyAddressOwnership: returns how many of the requested ids
    // belong to the user. Default-implemented per call so happy-path tests
    // (which pass a single valid address) pass without per-test wiring.
    count: vi.fn(({ where }: { where: { id: { in: string[] } } }) =>
      Promise.resolve(where.id.in.length)
    ),
  },
  // The singleton `store_settings` row read by getStoreSettings() before the
  // order is built. beforeEach installs a permissive default (COD on) so the
  // tests that predate the kill switch behave as they always did.
  storeSetting: {
    findUnique: vi.fn(),
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

// Sign the request in as `user_123` so requireAuth() resolves to a user. Also
// (re)installs the default address-ownership check: every requested id is owned.
function signIn() {
  mockAuth.mockResolvedValue(createMockSession({ id: 'user_123' }))
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_123' }))
  mockPrisma.address.count.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
    Promise.resolve(where.id.in.length)
  )
}

describe('Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // COD switched on store-wide unless a test says otherwise.
    mockPrisma.storeSetting.findUnique.mockResolvedValue({ codEnabled: true })
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

    it('returns 400 when an address does not belong to the user', async () => {
      signIn()
      // Simulate the address not being found in this user's address book.
      mockPrisma.address.count.mockResolvedValue(0)

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({ ...validOrderData, shippingAddressId: 'someone_elses_addr' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_ADDRESS')
      // Must reject before touching the cart or creating an order.
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
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

  // The store-wide COD kill switch. This route is the second, independent
  // order-creation path — no client code posts to it, so it is exactly where a
  // shopper (or a stale tab) would land a COD order after an admin turned COD
  // off. The switch has to hold here on its own, without any help from the UI.
  describe('POST /api/orders — store-wide COD switch', () => {
    const validOrderData = {
      shippingAddressId: 'addr_123',
      billingAddressId: 'addr_123',
      paymentMethod: 'COD',
    }

    const post = async (body: Record<string, unknown> = validOrderData) => {
      const { POST } = await import('@/app/api/orders/route')
      return POST(
        new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      )
    }

    // A successful create still has to return something order-shaped.
    const expectCreateToSucceed = () =>
      mockPrisma.order.create.mockResolvedValue({
        ...createMockOrder(),
        items: [],
        shippingAddress: createMockAddress(),
      })

    /** Flip the store-wide switch off. */
    const codOff = () => mockPrisma.storeSetting.findUnique.mockResolvedValue({ codEnabled: false })

    it('rejects a COD order with 409 when COD is switched off store-wide', async () => {
      signIn()
      codOff()
      // Every product in the cart still lists COD — the store-wide switch
      // alone must be enough to stop the order.
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItem())
      expectCreateToSucceed()

      const response = await post()
      const data = await response.json()

      expect(response.status).toBe(409)
      // Inline route validation uses the flat shape, not the nested apiError one.
      expect(typeof data.error).toBe('string')
      expect(data.error).toContain('Cash on Delivery')
      expect(data.error).toContain('currently unavailable')
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('reads the singleton settings row', async () => {
      signIn()
      codOff()
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItem())

      await post()

      expect(mockPrisma.storeSetting.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { key: 'store' } })
      )
    })

    it('rejects a lowercase "cod" too', async () => {
      // The route normalizes before gating, so casing is not a way around the
      // switch — and a hand-rolled POST is where odd casing turns up.
      signIn()
      codOff()
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItem())
      expectCreateToSucceed()

      const response = await post({ ...validOrderData, paymentMethod: 'cod' })

      expect(response.status).toBe(409)
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('does not block a prepaid order when COD is switched off', async () => {
      signIn()
      codOff()
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItem())
      expectCreateToSucceed()

      const response = await post({ ...validOrderData, paymentMethod: 'RAZORPAY' })

      expect(response.status).toBe(201)
      expect(mockPrisma.order.create).toHaveBeenCalled()
      expect(mockPrisma.order.create.mock.calls[0][0].data.paymentMethod).toBe('PREPAID')
    })

    it('allows COD when the settings row has never been written', async () => {
      // Fail-open: a database that predates this feature must behave exactly as
      // it did before, gated only by the per-product paymentModes.
      signIn()
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null)
      mockPrisma.cart.findUnique.mockResolvedValue(cartWithItem())
      expectCreateToSucceed()

      const response = await post()

      expect(response.status).toBe(201)
      expect(mockPrisma.order.create).toHaveBeenCalled()
      expect(mockPrisma.order.create.mock.calls[0][0].data.paymentMethod).toBe('COD')
    })

    it('reports the store-wide reason ahead of the per-product one', async () => {
      // Both gates would reject this order. The shopper should be told COD is
      // off store-wide — picking a different product would not help them.
      signIn()
      codOff()
      const product = createMockProduct({
        id: 'prod_123',
        name: 'Prepaid-only Saree',
        paymentModes: ['PREPAID'],
      })
      mockPrisma.cart.findUnique.mockResolvedValue(
        createMockCart({ items: [createMockCartItem({ product })] })
      )
      expectCreateToSucceed()

      const response = await post()
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('currently unavailable')
      expect(data.error).not.toContain('Prepaid-only Saree')
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
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
