import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockUser, createMockSession } from '../mocks/factories'

// Mock Auth.js — `auth()` resolves the session (or null when signed out).
// `requireAuth()` reads `session.user.id` then loads the user via Prisma.
const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

const mockPrisma = {
  user: { findUnique: vi.fn() },
  // `delete` and `deleteMany` are stubbed purely so the tests can prove the
  // route never reaches for them.
  order: {
    findFirst: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

const params = (id: string) => ({ params: Promise.resolve({ id }) })

const callDelete = async (id: string) => {
  const { DELETE } = await import('@/app/api/orders/[id]/route')
  return DELETE(new Request(`http://localhost/api/orders/${id}`), params(id))
}

/** An order row as the DELETE handler selects it. */
const order = (overrides: Record<string, unknown> = {}) => ({
  id: 'order_1',
  status: 'PENDING',
  paymentStatus: 'PENDING',
  customerHiddenAt: null,
  ...overrides,
})

function signIn() {
  mockAuth.mockResolvedValue(createMockSession({ id: 'user_123' }))
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_123' }))
}

describe('DELETE /api/orders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.order.update.mockResolvedValue(order())
  })

  describe('authentication and ownership', () => {
    it('401s when signed out', async () => {
      mockAuth.mockResolvedValue(null)

      const response = await callDelete('order_1')

      expect(response.status).toBe(401)
      expect(mockPrisma.order.update).not.toHaveBeenCalled()
    })

    it('scopes the lookup to the signed-in user', async () => {
      signIn()
      mockPrisma.order.findFirst.mockResolvedValue(order())

      await callDelete('order_1')

      expect(mockPrisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order_1', userId: 'user_123' },
        })
      )
    })

    it("404s for another customer's order rather than revealing it exists", async () => {
      // The userId is part of the where-clause, so someone else's order is
      // indistinguishable from one that was never there.
      signIn()
      mockPrisma.order.findFirst.mockResolvedValue(null)

      const response = await callDelete('someone_elses_order')

      expect(response.status).toBe(404)
      expect(mockPrisma.order.update).not.toHaveBeenCalled()
    })
  })

  describe('cancelling a live order', () => {
    beforeEach(signIn)

    it('cancels and hides an unpaid pending order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(order())

      const response = await callDelete('order_1')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({ success: true, cancelled: true })

      const { where, data: update } = mockPrisma.order.update.mock.calls[0][0]
      expect(where).toEqual({ id: 'order_1' })
      expect(update.status).toBe('CANCELLED')
      expect(update.paymentStatus).toBe('CANCELLED')
      expect(update.customerHiddenAt).toBeInstanceOf(Date)
    })

    it('updates the row instead of deleting it', async () => {
      // The order has to survive for admin, revenue figures and any webhook
      // that lands later — a hard delete would break all three.
      mockPrisma.order.findFirst.mockResolvedValue(order())

      await callDelete('order_1')

      expect(mockPrisma.order.update).toHaveBeenCalledTimes(1)
      expect(mockPrisma.order.delete).not.toHaveBeenCalled()
      expect(mockPrisma.order.deleteMany).not.toHaveBeenCalled()
    })

    it('restores no stock', async () => {
      // Stock is only decremented by the payment webhooks once capture
      // succeeds, so an unpaid order never reserved any to give back.
      mockPrisma.order.findFirst.mockResolvedValue(order())

      await callDelete('order_1')

      const { data: update } = mockPrisma.order.update.mock.calls[0][0]
      expect(JSON.stringify(update)).not.toMatch(/increment/)
    })
  })

  describe('clearing away an order that is already over', () => {
    beforeEach(signIn)

    it('hides a cancelled order without cancelling it again', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(
        order({ status: 'CANCELLED', paymentStatus: 'FAILED' })
      )

      const response = await callDelete('order_1')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.cancelled).toBe(false)

      const { data: update } = mockPrisma.order.update.mock.calls[0][0]
      expect(update.status).toBeUndefined()
      expect(update.paymentStatus).toBeUndefined()
      expect(update.customerHiddenAt).toBeInstanceOf(Date)
    })

    it('keeps the original timestamp when removed twice', async () => {
      // A double-tap or a retried request must not rewrite when it happened.
      const hiddenAt = new Date('2026-01-01T00:00:00.000Z')
      mockPrisma.order.findFirst.mockResolvedValue(
        order({ status: 'CANCELLED', customerHiddenAt: hiddenAt })
      )

      await callDelete('order_1')

      const { data: update } = mockPrisma.order.update.mock.calls[0][0]
      expect(update.customerHiddenAt).toBe(hiddenAt)
    })
  })

  describe('orders that are too far along', () => {
    beforeEach(signIn)

    it('409s on a paid order and changes nothing', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(
        order({ status: 'CONFIRMED', paymentStatus: 'PAID' })
      )

      const response = await callDelete('order_1')
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.reason).toBe('ALREADY_PAID')
      expect(data.error).toMatch(/already been paid/i)
      expect(mockPrisma.order.update).not.toHaveBeenCalled()
    })

    it('409s on a dispatched order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(order({ status: 'SHIPPED' }))

      const response = await callDelete('order_1')

      expect(response.status).toBe(409)
      expect((await response.json()).reason).toBe('DISPATCHED')
      expect(mockPrisma.order.update).not.toHaveBeenCalled()
    })

    it('409s on a delivered order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(order({ status: 'DELIVERED' }))

      const response = await callDelete('order_1')

      expect(response.status).toBe(409)
      expect((await response.json()).reason).toBe('DELIVERED')
      expect(mockPrisma.order.update).not.toHaveBeenCalled()
    })
  })
})

describe('GET /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.order.findMany.mockResolvedValue([])
  })

  it('leaves out orders the customer has cleared away', async () => {
    signIn()

    const { GET } = await import('@/app/api/orders/route')
    await GET()

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_123', customerHiddenAt: null },
      })
    )
  })
})
