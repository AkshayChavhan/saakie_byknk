import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createMockUser,
  createMockSession,
  createMockCart,
  createMockCartItem,
  createMockProduct,
  createMockOrder,
} from '../../mocks/factories'

// Mock Auth.js — `auth()` resolves the session (or null when signed out).
// requireAuth() reads session.user.id then re-loads the user via Prisma.
const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// Prisma models this route touches: `user` (requireAuth), `address`
// (verifyAddressOwnership), `cart`, `order`, and `storeSetting` — the last one
// is read through lib/server/settings.ts, which imports the same client.
const mockPrisma = {
  user: { findUnique: vi.fn() },
  cart: { findUnique: vi.fn() },
  order: { create: vi.fn() },
  address: { count: vi.fn() },
  storeSetting: { findUnique: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

/**
 * The gateway clients are module-level singletons built from env at import
 * time, so a plain object mock would freeze "configured / not configured" for
 * the whole file. Exporting them as getters over `mockGateways` lets a single
 * test null one out (to exercise the 503) while the rest run against a working
 * client — the route reads the live binding on every request.
 */
const mockRazorpayCreateOrder = vi.fn()
const mockStripeCreateIntent = vi.fn()
const mockGateways: { razorpay: unknown; stripe: unknown } = {
  razorpay: null,
  stripe: null,
}

vi.mock('@/lib/razorpay', () => ({
  get razorpay() {
    return mockGateways.razorpay
  },
}))

vi.mock('@/lib/stripe', () => ({
  get stripe() {
    return mockGateways.stripe
  },
}))

const ENDPOINT = 'http://localhost:3000/api/payments/create-intent'

/** Copy from lib/payment.ts — duplicated so a wording change fails loudly here. */
const COD_DISABLED_MESSAGE =
  'Cash on Delivery is currently unavailable. Please choose an online payment method.'

const codProduct = (overrides: Record<string, unknown> = {}) =>
  createMockProduct({
    id: 'prod_123',
    name: 'Kanjivaram Silk',
    price: 5999,
    stock: 10,
    paymentModes: ['COD', 'PREPAID'],
    ...overrides,
  })

const cartOf = (
  items: Array<{ product: ReturnType<typeof createMockProduct>; quantity?: number }>
) =>
  createMockCart({
    items: items.map(({ product, quantity = 1 }, i) =>
      createMockCartItem({
        id: `cart_item_${i}`,
        productId: (product as { id: string }).id,
        quantity,
        price: (product as { price: number }).price,
        product,
      })
    ),
  })

const cartWith = (product: ReturnType<typeof createMockProduct>, quantity = 1) =>
  cartOf([{ product, quantity }])

function signIn() {
  mockAuth.mockResolvedValue(createMockSession({ id: 'user_123' }))
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_123' }))
}

async function post(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/payments/create-intent/route')
  return POST(
    new NextRequest(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  )
}

/** The body the checkout UI posts for a Cash-on-Delivery order. */
const COD_BODY = { paymentGateway: 'cod', shippingAddressId: 'addr_123' }

/** The data object handed to prisma.order.create. */
const createdOrderData = () => mockPrisma.order.create.mock.calls[0][0].data

describe('POST /api/payments/create-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    signIn()
    // Every requested address id belongs to this user.
    mockPrisma.address.count.mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
      Promise.resolve(where.id.in.length)
    )
    mockPrisma.cart.findUnique.mockResolvedValue(cartWith(codProduct()))
    mockPrisma.storeSetting.findUnique.mockResolvedValue({ codEnabled: true })
    mockPrisma.order.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...createMockOrder(), ...data, id: 'order_new' })
    )

    // Both gateways configured by default; individual tests null one out.
    mockGateways.razorpay = { orders: { create: mockRazorpayCreateOrder } }
    mockGateways.stripe = { paymentIntents: { create: mockStripeCreateIntent } }
    mockRazorpayCreateOrder.mockResolvedValue({ id: 'order_RZP123' })
    mockStripeCreateIntent.mockResolvedValue({ client_secret: 'pi_123_secret' })
  })

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const response = await post(COD_BODY)

      expect(response.status).toBe(401)
      // requireAuth uses the nested error envelope.
      expect((await response.json()).error.message).toBe('Unauthorized - No session')
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('returns 404 when the session points at a deleted user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const response = await post(COD_BODY)

      expect(response.status).toBe(404)
      expect((await response.json()).error.code).toBe('USER_NOT_FOUND')
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })
  })

  describe('request validation', () => {
    it('rejects a request with no shipping address', async () => {
      const response = await post({ paymentGateway: 'cod' })

      expect(response.status).toBe(400)
      // Inline route validation uses the flat error shape.
      expect((await response.json()).error).toBe('Shipping address is required')
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('rejects an address that belongs to somebody else', async () => {
      mockPrisma.address.count.mockResolvedValue(0)

      const response = await post({ ...COD_BODY, shippingAddressId: 'someone_elses_addr' })

      expect(response.status).toBe(400)
      expect((await response.json()).error.code).toBe('INVALID_ADDRESS')
      // Must bail before reading the cart or writing an order.
      expect(mockPrisma.cart.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('checks the billing address too', async () => {
      await post({ ...COD_BODY, billingAddressId: 'addr_456' })

      expect(mockPrisma.address.count).toHaveBeenCalledWith({
        where: { id: { in: ['addr_123', 'addr_456'] }, userId: 'user_123' },
      })
    })

    it('returns 400 when the user has no cart', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(null)

      const response = await post(COD_BODY)

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Cart is empty')
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('returns 400 when the cart has no items', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }))

      const response = await post(COD_BODY)

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Cart is empty')
    })

    it('returns 400 when an item outruns its stock', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(
        cartWith(codProduct({ name: 'Banarasi Silk', stock: 1 }), 3)
      )

      const response = await post(COD_BODY)

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Insufficient stock for Banarasi Silk')
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('allows an order for exactly the remaining stock', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(cartWith(codProduct({ stock: 2 }), 2))

      expect((await post(COD_BODY)).status).toBe(200)
    })
  })

  describe('gateway validation', () => {
    it('rejects an unknown gateway without creating an order', async () => {
      const response = await post({ ...COD_BODY, paymentGateway: 'bitcoin' })

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Unsupported payment method')
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('rejects a missing gateway rather than defaulting to prepaid', async () => {
      // '' normalizes to PREPAID, so without the gateway allow-list this used to
      // mint an unpaid PENDING order labelled PREPAID.
      const response = await post({ shippingAddressId: 'addr_123' })

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Unsupported payment method')
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('accepts a gateway with stray case and whitespace', async () => {
      const response = await post({ ...COD_BODY, paymentGateway: '  CoD ' })

      expect(response.status).toBe(200)
      expect(createdOrderData().paymentMethod).toBe('COD')
    })

    it('returns 503 when razorpay is not configured', async () => {
      mockGateways.razorpay = null

      const response = await post({ ...COD_BODY, paymentGateway: 'razorpay' })

      expect(response.status).toBe(503)
      expect((await response.json()).error).toBe(
        'Online payment is unavailable right now. Please try again later.'
      )
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('returns 503 when stripe is not configured', async () => {
      mockGateways.stripe = null

      const response = await post({ ...COD_BODY, paymentGateway: 'stripe' })

      expect(response.status).toBe(503)
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })
  })

  describe('store-wide COD switch', () => {
    it('rejects COD when an admin has switched it off, even for a COD-eligible cart', async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({ codEnabled: false })
      // Every product still lists COD — the per-product gate would have passed,
      // so a 409 here can only have come from the store-wide switch.
      mockPrisma.cart.findUnique.mockResolvedValue(
        cartWith(codProduct({ paymentModes: ['COD', 'PREPAID'] }))
      )

      const response = await post(COD_BODY)

      expect(response.status).toBe(409)
      expect((await response.json()).error).toBe(COD_DISABLED_MESSAGE)
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('reads the singleton settings row', async () => {
      await post(COD_BODY)

      expect(mockPrisma.storeSetting.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { key: 'store' } })
      )
    })

    it('still allows prepaid checkout while COD is off', async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({ codEnabled: false })

      const response = await post({ ...COD_BODY, paymentGateway: 'razorpay' })

      expect(response.status).toBe(200)
      expect(mockPrisma.order.create).toHaveBeenCalled()
    })

    it('creates the COD order when the switch is on', async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({ codEnabled: true })

      const response = await post(COD_BODY)

      expect(response.status).toBe(200)
      expect((await response.json()).gateway).toBe('cod')
      expect(mockPrisma.order.create).toHaveBeenCalled()
    })

    it('fails open when the settings row has never been written', async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null)

      const response = await post(COD_BODY)

      expect(response.status).toBe(200)
      expect(createdOrderData().paymentMethod).toBe('COD')
    })

    it('blames the store switch, not the product, when both would reject', async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({ codEnabled: false })
      mockPrisma.cart.findUnique.mockResolvedValue(
        cartWith(codProduct({ name: 'Prepaid-only Saree', paymentModes: ['PREPAID'] }))
      )

      const response = await post(COD_BODY)

      expect(response.status).toBe(409)
      expect((await response.json()).error).toBe(COD_DISABLED_MESSAGE)
    })
  })

  describe('per-product payment modes', () => {
    it('rejects COD for a prepaid-only product', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(
        cartWith(codProduct({ name: 'Prepaid-only Saree', paymentModes: ['PREPAID'] }))
      )

      const response = await post(COD_BODY)

      expect(response.status).toBe(409)
      expect((await response.json()).error).toBe(
        '"Prepaid-only Saree" does not accept Cash on Delivery. Please choose a different payment method.'
      )
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('rejects a prepaid gateway for a COD-only product', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(
        cartWith(codProduct({ name: 'COD-only Saree', paymentModes: ['COD'] }))
      )

      const response = await post({ ...COD_BODY, paymentGateway: 'razorpay' })

      expect(response.status).toBe(409)
      expect((await response.json()).error).toBe(
        '"COD-only Saree" does not accept prepaid (online) payment. Please choose a different payment method.'
      )
      expect(mockRazorpayCreateOrder).not.toHaveBeenCalled()
    })

    it('rejects the whole cart when a single item refuses the method', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(
        cartOf([
          { product: codProduct({ id: 'p1', name: 'Fine' }) },
          { product: codProduct({ id: 'p2', name: 'Prepaid-only Saree', paymentModes: ['PREPAID'] }) },
        ])
      )

      const response = await post(COD_BODY)

      expect(response.status).toBe(409)
      expect((await response.json()).error).toContain('"Prepaid-only Saree"')
      expect(mockPrisma.order.create).not.toHaveBeenCalled()
    })

    it('treats a product with no configured modes as prepaid-only', async () => {
      // Matches the schema default @default([PREPAID]) for legacy rows.
      mockPrisma.cart.findUnique.mockResolvedValue(
        cartWith(codProduct({ name: 'Legacy Saree', paymentModes: [] }))
      )

      expect((await post(COD_BODY)).status).toBe(409)
      expect((await post({ ...COD_BODY, paymentGateway: 'razorpay' })).status).toBe(200)
    })
  })

  describe('Order.paymentMethod persistence', () => {
    it('stores the concrete instrument for a UPI order', async () => {
      await post({ ...COD_BODY, paymentGateway: 'razorpay', paymentChannel: 'upi' })

      expect(createdOrderData().paymentMethod).toBe('UPI')
    })

    it('stores CARD for a card order', async () => {
      await post({ ...COD_BODY, paymentGateway: 'stripe', paymentChannel: 'card' })

      expect(createdOrderData().paymentMethod).toBe('CARD')
    })

    it('stores COD for a cash-on-delivery order', async () => {
      await post(COD_BODY)

      expect(createdOrderData().paymentMethod).toBe('COD')
    })

    it('falls back to PREPAID when no channel is sent', async () => {
      await post({ ...COD_BODY, paymentGateway: 'razorpay' })

      expect(createdOrderData().paymentMethod).toBe('PREPAID')
    })

    it('ignores a channel that contradicts the gateway', async () => {
      // A 'cod' channel on a prepaid gateway must not label the order COD —
      // that would read back as an unpaid cash order in the admin view.
      await post({ ...COD_BODY, paymentGateway: 'razorpay', paymentChannel: 'cod' })

      expect(createdOrderData().paymentMethod).toBe('PREPAID')
    })

    it('ignores an unknown channel', async () => {
      await post({ ...COD_BODY, paymentGateway: 'razorpay', paymentChannel: 'crypto' })

      expect(createdOrderData().paymentMethod).toBe('PREPAID')
    })
  })

  describe('order contents', () => {
    it('prices the order server-side from the product rows', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(cartWith(codProduct({ price: 200 }), 2))

      await post(COD_BODY)

      // subtotal 400 (2 × 200), + 99 shipping under the ₹999 free-shipping threshold.
      expect(createdOrderData()).toMatchObject({ subtotal: 400, tax: 0, shipping: 99, total: 499 })
    })

    it('ships free above the threshold', async () => {
      await post(COD_BODY)

      expect(createdOrderData()).toMatchObject({ subtotal: 5999, shipping: 0, total: 5999 })
    })

    it('records the order against the signed-in user as PENDING', async () => {
      await post(COD_BODY)

      expect(createdOrderData()).toMatchObject({
        userId: 'user_123',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        shippingAddressId: 'addr_123',
      })
      expect(createdOrderData().orderNumber).toMatch(/^ORD-/)
    })

    it('bills to the shipping address when no billing address is given', async () => {
      await post(COD_BODY)

      expect(createdOrderData().billingAddressId).toBe('addr_123')
    })

    it('keeps a separate billing address when one is given', async () => {
      await post({ ...COD_BODY, billingAddressId: 'addr_456' })

      expect(createdOrderData().billingAddressId).toBe('addr_456')
    })

    it('copies every cart line onto the order', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(
        cartOf([
          { product: codProduct({ id: 'p1', price: 200 }), quantity: 2 },
          { product: codProduct({ id: 'p2', price: 500 }), quantity: 1 },
        ])
      )

      await post(COD_BODY)

      expect(createdOrderData().items.create).toEqual([
        { productId: 'p1', quantity: 2, price: 200, total: 400 },
        { productId: 'p2', quantity: 1, price: 500, total: 500 },
      ])
    })
  })

  describe('gateway hand-off', () => {
    it('opens a razorpay order for the created order', async () => {
      const response = await post({ ...COD_BODY, paymentGateway: 'razorpay', paymentChannel: 'upi' })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({ success: true, gateway: 'razorpay', razorpayOrderId: 'order_RZP123' })
      expect(data.order.id).toBe('order_new')
      expect(mockRazorpayCreateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 599900, // ₹5,999 in paise
          currency: 'INR',
          receipt: createdOrderData().orderNumber,
          notes: { orderId: 'order_new' },
        })
      )
      expect(mockStripeCreateIntent).not.toHaveBeenCalled()
    })

    it('creates a stripe payment intent and returns its client secret', async () => {
      const response = await post({ ...COD_BODY, paymentGateway: 'stripe' })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({ success: true, gateway: 'stripe', clientSecret: 'pi_123_secret' })
      expect(mockStripeCreateIntent).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 599900, currency: 'inr' })
      )
      expect(mockRazorpayCreateOrder).not.toHaveBeenCalled()
    })

    it('charges nothing for a COD order', async () => {
      const response = await post(COD_BODY)
      const data = await response.json()

      expect(data).toMatchObject({ success: true, gateway: 'cod' })
      expect(data.clientSecret).toBeUndefined()
      expect(data.razorpayOrderId).toBeUndefined()
      expect(mockRazorpayCreateOrder).not.toHaveBeenCalled()
      expect(mockStripeCreateIntent).not.toHaveBeenCalled()
    })
  })

  describe('failures', () => {
    it('returns 500 when the order write fails', async () => {
      mockPrisma.order.create.mockRejectedValue(new Error('Database error'))

      const response = await post(COD_BODY)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('returns 500 when the gateway rejects the hand-off', async () => {
      mockRazorpayCreateOrder.mockRejectedValue(new Error('Razorpay is down'))

      const response = await post({ ...COD_BODY, paymentGateway: 'razorpay' })

      expect(response.status).toBe(500)
      expect((await response.json()).success).toBe(false)
    })
  })
})
