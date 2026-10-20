import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Settlement must be idempotent: whichever of the confirm route and the
 * webhook arrives first does the work, every later caller is a no-op.
 */
const mockPrisma = {
  order: { updateMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  cartItem: { deleteMany: vi.fn() },
  product: { updateMany: vi.fn() },
  $transaction: vi.fn(),
}

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

const paidOrder = {
  orderNumber: 'ORD-1',
  userId: 'user_1',
  notes: null,
  items: [
    { productId: 'prod_a', quantity: 2 },
    { productId: 'prod_b', quantity: 1 },
  ],
}

describe('settlePaidOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => unknown) =>
      fn(mockPrisma)
    )
    mockPrisma.order.findUnique.mockResolvedValue(paidOrder)
    mockPrisma.product.updateMany.mockResolvedValue({ count: 1 })
  })

  it('claims the order, clears the bought lines and decrements stock once', async () => {
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 })
    const { settlePaidOrder } = await import('@/lib/server/payments')

    const result = await settlePaidOrder({ orderId: 'order_1', paymentId: 'pay_1' })

    expect(result).toEqual({ applied: true, orderNumber: 'ORD-1', oversold: [] })
    // The claim is conditional on the order not being PAID already.
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order_1', paymentStatus: { in: ['PENDING', 'FAILED', 'CANCELLED'] } },
        data: expect.objectContaining({ paymentStatus: 'PAID', paymentId: 'pay_1' }),
      })
    )
    // Only the products that were bought leave the cart.
    expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cart: { userId: 'user_1' }, productId: { in: ['prod_a', 'prod_b'] } },
    })
    // Stock is decremented with a floor, never blindly.
    expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod_a', stock: { gte: 2 } },
      data: { stock: { decrement: 2 }, salesCount: { increment: 2 } },
    })
    expect(mockPrisma.product.updateMany).toHaveBeenCalledTimes(2)
  })

  it('is a no-op when the order was already settled (webhook redelivery)', async () => {
    mockPrisma.order.updateMany.mockResolvedValue({ count: 0 })
    const { settlePaidOrder } = await import('@/lib/server/payments')

    const result = await settlePaidOrder({ orderId: 'order_1', paymentId: 'pay_1' })

    expect(result.applied).toBe(false)
    expect(mockPrisma.cartItem.deleteMany).not.toHaveBeenCalled()
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled()
  })

  it('floors stock at zero and flags the order when a product is oversold', async () => {
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.product.updateMany
      .mockResolvedValueOnce({ count: 0 }) // prod_a: guarded decrement fails
      .mockResolvedValueOnce({ count: 1 }) // prod_a: floor to 0
      .mockResolvedValueOnce({ count: 1 }) // prod_b: fine
    const { settlePaidOrder } = await import('@/lib/server/payments')

    const result = await settlePaidOrder({ orderId: 'order_1', paymentId: 'pay_1' })

    expect(result.oversold).toEqual(['prod_a'])
    expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod_a' },
      data: { stock: 0, salesCount: { increment: 2 } },
    })
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order_1' },
      data: { notes: expect.stringContaining('OVERSOLD') },
    })
  })

  it('leaves stock alone for a pre-booked line and does not call it oversold', async () => {
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.order.findUnique.mockResolvedValue({
      ...paidOrder,
      items: [
        { productId: 'prod_a', quantity: 1, isPrebook: true },
        { productId: 'prod_b', quantity: 1, isPrebook: false },
      ],
    })
    const { settlePaidOrder } = await import('@/lib/server/payments')

    const result = await settlePaidOrder({ orderId: 'order_1', paymentId: 'pay_1' })

    expect(result.oversold).toEqual([])
    // The pre-booked saree only counts as a sale.
    expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod_a' },
      data: { salesCount: { increment: 1 } },
    })
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'prod_a', stock: { gte: 1 } } })
    )
    // The in-stock line is decremented as before.
    expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod_b', stock: { gte: 1 } },
      data: { stock: { decrement: 1 }, salesCount: { increment: 1 } },
    })
    expect(mockPrisma.order.update).not.toHaveBeenCalled()
  })

  it('runs everything inside one transaction', async () => {
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 })
    const { settlePaidOrder } = await import('@/lib/server/payments')
    await settlePaidOrder({ orderId: 'order_1', paymentId: 'pay_1' })
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
  })
})

describe('settleFailedPayment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('only moves a PENDING order, so a late failure cannot undo a capture', async () => {
    mockPrisma.order.updateMany.mockResolvedValue({ count: 0 })
    const { settleFailedPayment } = await import('@/lib/server/payments')

    const result = await settleFailedPayment('order_1')

    expect(result.applied).toBe(false)
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order_1', paymentStatus: 'PENDING' },
      data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
    })
  })
})

describe('settleRefund', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ignores a refund for a payment that is not PAID or is unknown', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null)
    const { settleRefund } = await import('@/lib/server/payments')

    const result = await settleRefund({ paymentId: 'pay_x' })

    expect(result.applied).toBe(false)
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
  })

  it('marks a full refund REFUNDED', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({ id: 'order_1', orderNumber: 'ORD-1', total: 1000, notes: null })
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 })
    const { settleRefund } = await import('@/lib/server/payments')

    const result = await settleRefund({ paymentId: 'pay_1', amountMinor: 100000 })

    expect(result.applied).toBe(true)
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order_1', paymentStatus: 'PAID' },
      data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
    })
  })

  it('records a partial refund in the notes without changing the status', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({ id: 'order_1', orderNumber: 'ORD-1', total: 1000, notes: 'gift' })
    const { settleRefund } = await import('@/lib/server/payments')

    const result = await settleRefund({ paymentId: 'pay_1', amountMinor: 25000 })

    expect(result.applied).toBe(true)
    expect(mockPrisma.order.updateMany).not.toHaveBeenCalled()
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order_1' },
      data: { notes: 'gift\nPARTIAL REFUND: 250.00 of 1000.00' },
    })
  })
})

describe('findOrderForGateway', () => {
  beforeEach(() => vi.clearAllMocks())

  it('prefers the gateway order id and falls back to the store id', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null)
    mockPrisma.order.findUnique.mockResolvedValue({ id: 'order_1' })
    const { findOrderForGateway } = await import('@/lib/server/payments')

    const found = await findOrderForGateway({ gatewayOrderId: 'order_RZP', orderId: 'order_1' })

    expect(found).toEqual({ id: 'order_1' })
    expect(mockPrisma.order.findFirst).toHaveBeenCalledWith({
      where: { gatewayOrderId: 'order_RZP' },
      select: { id: true },
    })
  })

  it('returns null when neither id is given', async () => {
    const { findOrderForGateway } = await import('@/lib/server/payments')
    expect(await findOrderForGateway({})).toBeNull()
  })
})
