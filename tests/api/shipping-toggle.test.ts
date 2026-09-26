import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createMockUser,
  createMockSession,
  createMockCart,
  createMockCartItem,
  createMockProduct,
} from '../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

const mockPrisma = {
  user: { findUnique: vi.fn() },
  cart: { findUnique: vi.fn() },
  order: { create: vi.fn() },
  address: {
    count: vi.fn(({ where }: { where: { id: { in: string[] } } }) =>
      Promise.resolve(where.id.in.length)
    ),
  },
  storeSettings: { findUnique: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

const mockRazorpayCreateOrder = vi.fn()
vi.mock('@/lib/razorpay', () => ({
  get razorpay() {
    return { orders: { create: mockRazorpayCreateOrder } }
  },
}))
vi.mock('@/lib/stripe', () => ({ get stripe() { return null } }))

/** A cart whose subtotal (₹400) sits below the free-shipping threshold. */
const cheapCart = () =>
  createMockCart({
    items: [
      createMockCartItem({
        quantity: 2,
        product: createMockProduct({ id: 'prod_1', price: 200, stock: 10 }),
      }),
    ],
  })

const orderData = () => mockPrisma.order.create.mock.calls[0][0].data

const post = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('Shipping toggle → amount charged', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(createMockSession({ id: 'user_123' }))
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_123' }))
    mockPrisma.cart.findUnique.mockResolvedValue(cheapCart())
    mockPrisma.order.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'order_1', orderNumber: 'ORD-1', total: data.total })
    )
    mockRazorpayCreateOrder.mockResolvedValue({ id: 'rzp_order_1' })
  })

  describe('POST /api/orders', () => {
    const body = { shippingAddressId: 'addr_123' }
    const url = 'http://localhost:3000/api/orders'

    it('charges the flat fee while the toggle is on', async () => {
      mockPrisma.storeSettings.findUnique.mockResolvedValue({
        shippingEnabled: true,
        updatedAt: new Date(),
      })
      const { POST } = await import('@/app/api/orders/route')

      await POST(post(url, body))

      expect(orderData()).toMatchObject({ subtotal: 400, shipping: 99, total: 499 })
    })

    it('charges no shipping while the toggle is off', async () => {
      mockPrisma.storeSettings.findUnique.mockResolvedValue({
        shippingEnabled: false,
        updatedAt: new Date(),
      })
      const { POST } = await import('@/app/api/orders/route')

      await POST(post(url, body))

      expect(orderData()).toMatchObject({ subtotal: 400, shipping: 0, total: 400 })
    })

    it('charges the fee when the setting has never been saved', async () => {
      mockPrisma.storeSettings.findUnique.mockResolvedValue(null)
      const { POST } = await import('@/app/api/orders/route')

      await POST(post(url, body))

      expect(orderData()).toMatchObject({ shipping: 99, total: 499 })
    })
  })

  describe('POST /api/payments/create-intent', () => {
    const body = { paymentGateway: 'razorpay', shippingAddressId: 'addr_123' }
    const url = 'http://localhost:3000/api/payments/create-intent'

    it('charges the flat fee while the toggle is on', async () => {
      mockPrisma.storeSettings.findUnique.mockResolvedValue({
        shippingEnabled: true,
        updatedAt: new Date(),
      })
      const { POST } = await import('@/app/api/payments/create-intent/route')

      await POST(post(url, body))

      expect(orderData()).toMatchObject({ subtotal: 400, shipping: 99, total: 499 })
    })

    it('charges no shipping while the toggle is off', async () => {
      mockPrisma.storeSettings.findUnique.mockResolvedValue({
        shippingEnabled: false,
        updatedAt: new Date(),
      })
      const { POST } = await import('@/app/api/payments/create-intent/route')

      await POST(post(url, body))

      expect(orderData()).toMatchObject({ subtotal: 400, shipping: 0, total: 400 })
    })

    it('asks the gateway for the reduced amount when the toggle is off', async () => {
      mockPrisma.storeSettings.findUnique.mockResolvedValue({
        shippingEnabled: false,
        updatedAt: new Date(),
      })
      const { POST } = await import('@/app/api/payments/create-intent/route')

      await POST(post(url, body))

      // ₹400 in paise — the shipping fee must not reach the payment gateway.
      expect(mockRazorpayCreateOrder).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 40000 })
      )
    })
  })
})
