import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

const mockSettle = {
  findOrderForGateway: vi.fn(),
  settlePaidOrder: vi.fn(),
  settleFailedPayment: vi.fn(),
  settleRefund: vi.fn(),
}
vi.mock('@/lib/server/payments', () => mockSettle)

const SECRET = 'rzp_webhook_secret'
const ENDPOINT = 'http://localhost:3000/api/webhooks/razorpay'

function signed(body: unknown, secret = SECRET) {
  const raw = JSON.stringify(body)
  const sig = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  return new NextRequest(ENDPOINT, {
    method: 'POST',
    body: raw,
    headers: { 'x-razorpay-signature': sig },
  })
}

const captured = (overrides: Record<string, unknown> = {}) => ({
  event: 'payment.captured',
  payload: {
    payment: {
      entity: { id: 'pay_1', order_id: 'order_RZP', notes: { orderId: 'order_1' }, ...overrides },
    },
  },
})

describe('POST /api/webhooks/razorpay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', SECRET)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSettle.findOrderForGateway.mockResolvedValue({ id: 'order_1' })
    mockSettle.settlePaidOrder.mockResolvedValue({ applied: true, orderNumber: 'ORD-1', oversold: [] })
    mockSettle.settleFailedPayment.mockResolvedValue({ applied: true, orderNumber: null, oversold: [] })
    mockSettle.settleRefund.mockResolvedValue({ applied: true, orderNumber: 'ORD-1', oversold: [] })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('rejects a bad signature without touching any order', async () => {
    const { POST } = await import('@/app/api/webhooks/razorpay/route')
    const response = await POST(signed(captured(), 'wrong'))

    expect(response.status).toBe(400)
    expect(mockSettle.settlePaidOrder).not.toHaveBeenCalled()
  })

  it('settles a captured payment through the gateway order id', async () => {
    const { POST } = await import('@/app/api/webhooks/razorpay/route')
    const response = await POST(signed(captured()))

    expect(response.status).toBe(200)
    expect(mockSettle.findOrderForGateway).toHaveBeenCalledWith({
      gatewayOrderId: 'order_RZP',
      orderId: 'order_1',
    })
    expect(mockSettle.settlePaidOrder).toHaveBeenCalledWith({ orderId: 'order_1', paymentId: 'pay_1' })
  })

  it('acknowledges a capture for an unknown order so Razorpay stops retrying', async () => {
    mockSettle.findOrderForGateway.mockResolvedValue(null)
    const { POST } = await import('@/app/api/webhooks/razorpay/route')
    const response = await POST(signed(captured()))

    expect(response.status).toBe(200)
    expect(mockSettle.settlePaidOrder).not.toHaveBeenCalled()
  })

  it('answers 200 on a redelivered capture that was already settled', async () => {
    mockSettle.settlePaidOrder.mockResolvedValue({ applied: false, orderNumber: null, oversold: [] })
    const { POST } = await import('@/app/api/webhooks/razorpay/route')
    const response = await POST(signed(captured()))
    expect(response.status).toBe(200)
  })

  it('routes payment.failed and refund.created to their settlers', async () => {
    const { POST } = await import('@/app/api/webhooks/razorpay/route')

    await POST(signed({ ...captured(), event: 'payment.failed' }))
    expect(mockSettle.settleFailedPayment).toHaveBeenCalledWith('order_1')

    await POST(
      signed({ event: 'refund.created', payload: { refund: { entity: { payment_id: 'pay_1', amount: 5000 } } } })
    )
    expect(mockSettle.settleRefund).toHaveBeenCalledWith({ paymentId: 'pay_1', amountMinor: 5000 })
  })

  it('returns 500 when the secret is missing (a config error that must be loud)', async () => {
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', '')
    const { POST } = await import('@/app/api/webhooks/razorpay/route')
    const response = await POST(signed(captured()))
    expect(response.status).toBe(500)
  })
})
