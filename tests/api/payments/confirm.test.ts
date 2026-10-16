import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { createMockSession, createMockUser } from '../../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

const mockPrisma = {
  user: { findUnique: vi.fn() },
  order: { findFirst: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

const mockSettlePaidOrder = vi.fn()
vi.mock('@/lib/server/payments', () => ({
  settlePaidOrder: (...args: unknown[]) => mockSettlePaidOrder(...args),
}))

const KEY_SECRET = 'rzp_key_secret'
const ENDPOINT = 'http://localhost:3000/api/payments/confirm'

const sign = (razorpayOrderId: string, paymentId: string) =>
  crypto.createHmac('sha256', KEY_SECRET).update(`${razorpayOrderId}|${paymentId}`).digest('hex')

function confirmRequest(body: Record<string, unknown>) {
  return new NextRequest(ENDPOINT, { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/payments/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('RAZORPAY_KEY_SECRET', KEY_SECRET)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockAuth.mockResolvedValue(createMockSession({ id: 'user_123' }))
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_123' }))
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'order_B',
      gatewayOrderId: 'order_RZP_B',
      paymentStatus: 'PENDING',
    })
    mockSettlePaidOrder.mockResolvedValue({ applied: true, orderNumber: 'ORD-B', oversold: [] })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('confirms when the signature is valid for the order\'s own Razorpay order', async () => {
    const { POST } = await import('@/app/api/payments/confirm/route')
    const response = await POST(
      confirmRequest({
        orderId: 'order_B',
        razorpay_order_id: 'order_RZP_B',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: sign('order_RZP_B', 'pay_1'),
      })
    )

    expect(response.status).toBe(200)
    expect(mockSettlePaidOrder).toHaveBeenCalledWith({ orderId: 'order_B', paymentId: 'pay_1' })
  })

  it('refuses a genuine signature replayed against a different store order', async () => {
    // Signature is real, but it was issued for Razorpay order A, and the
    // client names store order B (whose Razorpay order is order_RZP_B).
    const { POST } = await import('@/app/api/payments/confirm/route')
    const response = await POST(
      confirmRequest({
        orderId: 'order_B',
        razorpay_order_id: 'order_RZP_A',
        razorpay_payment_id: 'pay_A',
        razorpay_signature: sign('order_RZP_A', 'pay_A'),
      })
    )

    expect(response.status).toBe(400)
    expect(mockSettlePaidOrder).not.toHaveBeenCalled()
  })

  it('refuses an order that has no gateway order id stamped', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({ id: 'order_B', gatewayOrderId: null, paymentStatus: 'PENDING' })
    const { POST } = await import('@/app/api/payments/confirm/route')
    const response = await POST(
      confirmRequest({
        orderId: 'order_B',
        razorpay_order_id: 'order_RZP_B',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: sign('order_RZP_B', 'pay_1'),
      })
    )
    expect(response.status).toBe(400)
    expect(mockSettlePaidOrder).not.toHaveBeenCalled()
  })

  it('refuses a forged signature', async () => {
    const { POST } = await import('@/app/api/payments/confirm/route')
    const response = await POST(
      confirmRequest({
        orderId: 'order_B',
        razorpay_order_id: 'order_RZP_B',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'deadbeef',
      })
    )
    expect(response.status).toBe(400)
    expect(mockSettlePaidOrder).not.toHaveBeenCalled()
  })

  it('only looks at the signed-in user\'s orders', async () => {
    const { POST } = await import('@/app/api/payments/confirm/route')
    await POST(
      confirmRequest({
        orderId: 'order_B',
        razorpay_order_id: 'order_RZP_B',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: sign('order_RZP_B', 'pay_1'),
      })
    )
    expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'order_B', userId: 'user_123' } })
    )
  })

  it('reports an already-settled order as confirmed without erroring', async () => {
    mockSettlePaidOrder.mockResolvedValue({ applied: false, orderNumber: null, oversold: [] })
    const { POST } = await import('@/app/api/payments/confirm/route')
    const response = await POST(
      confirmRequest({
        orderId: 'order_B',
        razorpay_order_id: 'order_RZP_B',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: sign('order_RZP_B', 'pay_1'),
      })
    )
    expect(response.status).toBe(200)
    expect((await response.json()).success).toBe(true)
  })
})
