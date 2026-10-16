import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSettle = {
  findOrderForGateway: vi.fn(),
  settlePaidOrder: vi.fn(),
  settleFailedPayment: vi.fn(),
  settleRefund: vi.fn(),
}
vi.mock('@/lib/server/payments', () => mockSettle)

const mockConstructEvent = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: { webhooks: { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) } },
}))

const ENDPOINT = 'http://localhost:3000/api/webhooks/stripe'
const request = () =>
  new NextRequest(ENDPOINT, { method: 'POST', body: '{}', headers: { 'stripe-signature': 'sig' } })

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test')
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

  it('rejects an event whose signature does not verify', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found')
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const response = await POST(request())

    expect(response.status).toBe(400)
    // The verification library's message is not echoed back.
    expect((await response.json()).error).toBe('Invalid signature')
    expect(mockSettle.settlePaidOrder).not.toHaveBeenCalled()
  })

  it('settles a succeeded payment intent', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', metadata: { orderId: 'order_1' } } },
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mockSettle.findOrderForGateway).toHaveBeenCalledWith({ gatewayOrderId: 'pi_1', orderId: 'order_1' })
    expect(mockSettle.settlePaidOrder).toHaveBeenCalledWith({ orderId: 'order_1', paymentId: 'pi_1' })
  })

  it('acknowledges an event for an unknown order', async () => {
    mockSettle.findOrderForGateway.mockResolvedValue(null)
    mockConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', metadata: {} } },
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mockSettle.settlePaidOrder).not.toHaveBeenCalled()
  })

  it('passes the refunded amount through on charge.refunded', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'charge.refunded',
      data: { object: { payment_intent: 'pi_1', amount_refunded: 1500 } },
    })
    const { POST } = await import('@/app/api/webhooks/stripe/route')
    await POST(request())
    expect(mockSettle.settleRefund).toHaveBeenCalledWith({ paymentId: 'pi_1', amountMinor: 1500 })
  })
})
