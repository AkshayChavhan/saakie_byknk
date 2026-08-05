import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockUser, createMockSession } from '../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

const mockTx = {
  address: { updateMany: vi.fn(), update: vi.fn() },
}

const mockPrisma = {
  user: { findUnique: vi.fn() },
  address: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  // Interactive form: the route passes a callback that receives `tx`.
  $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

const address = (overrides: Record<string, unknown> = {}) => ({
  id: 'addr_1',
  isDefault: false,
  ...overrides,
})

const callPatch = async (id: string) => {
  const { PATCH } = await import('@/app/api/users/addresses/[id]/route')
  return PATCH(new Request(`http://localhost/api/users/addresses/${id}`, { method: 'PATCH' }), {
    params: Promise.resolve({ id }),
  })
}

function signIn() {
  mockAuth.mockResolvedValue(createMockSession({ id: 'user_123' }))
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_123' }))
}

describe('PATCH /api/users/addresses/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.address.findMany.mockResolvedValue([])
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
    )
  })

  describe('authentication and ownership', () => {
    it('401s when signed out', async () => {
      mockAuth.mockResolvedValue(null)

      const response = await callPatch('addr_1')

      expect(response.status).toBe(401)
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })

    it('scopes the lookup to the signed-in user', async () => {
      signIn()
      mockPrisma.address.findFirst.mockResolvedValue(address())

      await callPatch('addr_1')

      expect(mockPrisma.address.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'addr_1', userId: 'user_123' } })
      )
    })

    it("404s for another user's address without promoting it", async () => {
      // The userId is in the where-clause, so someone else's address cannot be
      // attached to this account by guessing its id.
      signIn()
      mockPrisma.address.findFirst.mockResolvedValue(null)

      const response = await callPatch('someone_elses_address')

      expect(response.status).toBe(404)
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('promoting an address', () => {
    beforeEach(signIn)

    it('demotes the old default and promotes the new one', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(address())

      const response = await callPatch('addr_1')

      expect(response.status).toBe(200)
      expect(mockTx.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user_123', isDefault: true },
        data: { isDefault: false },
      })
      expect(mockTx.address.update).toHaveBeenCalledWith({
        where: { id: 'addr_1' },
        data: { isDefault: true },
      })
    })

    it('does both writes inside one transaction', async () => {
      // Exactly one address may be the default. Split across two independent
      // writes, a failure between them leaves the account with none or two.
      mockPrisma.address.findFirst.mockResolvedValue(address())

      await callPatch('addr_1')

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
      expect(mockPrisma.address.updateMany).not.toHaveBeenCalled()
      expect(mockPrisma.address.update).not.toHaveBeenCalled()
    })

    it('demotes only this user’s addresses', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(address())

      await callPatch('addr_1')

      const { where } = mockTx.address.updateMany.mock.calls[0][0]
      expect(where.userId).toBe('user_123')
    })

    it('writes nothing when the address is already the default', async () => {
      // Re-tapping the selected address is a no-op, not a pointless pair of
      // writes that would demote and re-promote the same row.
      mockPrisma.address.findFirst.mockResolvedValue(address({ isDefault: true }))

      const response = await callPatch('addr_1')

      expect(response.status).toBe(200)
      expect(mockPrisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('response', () => {
    beforeEach(signIn)

    it('returns the full list, default first', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(address())
      mockPrisma.address.findMany.mockResolvedValue([
        { id: 'addr_1', isDefault: true },
        { id: 'addr_2', isDefault: false },
      ])

      const response = await callPatch('addr_1')
      const data = await response.json()

      expect(data).toHaveLength(2)
      expect(data[0].id).toBe('addr_1')
      expect(mockPrisma.address.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_123' },
          orderBy: [{ isDefault: 'desc' }],
        })
      )
    })

    it('500s if the transaction fails, leaving the caller to retry', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(address())
      mockPrisma.$transaction.mockRejectedValue(new Error('replica set required'))

      const response = await callPatch('addr_1')

      expect(response.status).toBe(500)
    })
  })
})
