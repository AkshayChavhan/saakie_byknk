import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSession, createMockUser } from '../../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

const mockPrisma = {
  user: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))
vi.mock('@/lib/server/clerk-users', () => ({ deleteClerkUser: vi.fn() }))

const ENDPOINT = 'http://localhost:3000/api/admin/users/target_1'
const patch = (role: unknown) =>
  new NextRequest(ENDPOINT, { method: 'PATCH', body: JSON.stringify({ role }) })
const ctx = { params: Promise.resolve({ id: 'target_1' }) }

/** First call is requireAuth (the caller), second is the target lookup. */
function signedInAs(role: 'ADMIN' | 'SUPER_ADMIN', targetRole: string) {
  mockAuth.mockResolvedValue(createMockSession({ id: 'caller_1' }))
  mockPrisma.user.findUnique
    .mockResolvedValueOnce(createMockUser({ id: 'caller_1', role }))
    .mockResolvedValueOnce({ role: targetRole })
  mockPrisma.user.update.mockImplementation(({ data }: { data: { role: string } }) =>
    Promise.resolve(createMockUser({ id: 'target_1', role: data.role, password: 'hash' }))
  )
}

describe('PATCH /api/admin/users/[id] role changes', () => {
  // resetAllMocks, not clearAllMocks: a queued mockResolvedValueOnce the
  // previous test did not consume must not leak into the next one.
  beforeEach(() => vi.resetAllMocks())

  it('lets an ADMIN change an ordinary user', async () => {
    signedInAs('ADMIN', 'USER')
    const { PATCH } = await import('@/app/api/admin/users/[id]/route')
    const response = await PATCH(patch('ADMIN'), ctx)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.role).toBe('ADMIN')
    expect(body).not.toHaveProperty('password')
  })

  it('stops an ADMIN from demoting a SUPER_ADMIN', async () => {
    signedInAs('ADMIN', 'SUPER_ADMIN')
    const { PATCH } = await import('@/app/api/admin/users/[id]/route')
    const response = await PATCH(patch('USER'), ctx)

    expect(response.status).toBe(403)
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('stops an ADMIN from changing another ADMIN', async () => {
    signedInAs('ADMIN', 'ADMIN')
    const { PATCH } = await import('@/app/api/admin/users/[id]/route')
    const response = await PATCH(patch('USER'), ctx)
    expect(response.status).toBe(403)
  })

  it('never demotes the last SUPER_ADMIN', async () => {
    signedInAs('SUPER_ADMIN', 'SUPER_ADMIN')
    mockPrisma.user.count.mockResolvedValue(1)
    const { PATCH } = await import('@/app/api/admin/users/[id]/route')
    const response = await PATCH(patch('ADMIN'), ctx)

    expect(response.status).toBe(400)
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('lets a SUPER_ADMIN demote another SUPER_ADMIN when one remains', async () => {
    signedInAs('SUPER_ADMIN', 'SUPER_ADMIN')
    mockPrisma.user.count.mockResolvedValue(2)
    const { PATCH } = await import('@/app/api/admin/users/[id]/route')
    const response = await PATCH(patch('ADMIN'), ctx)
    expect(response.status).toBe(200)
  })

  it('rejects an unknown role before touching the database', async () => {
    signedInAs('SUPER_ADMIN', 'USER')
    const { PATCH } = await import('@/app/api/admin/users/[id]/route')
    const response = await PATCH(patch('OWNER'), ctx)
    expect(response.status).toBe(400)
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1) // only requireAuth
  })

  it('refuses a self role change', async () => {
    mockAuth.mockResolvedValue(createMockSession({ id: 'target_1' }))
    mockPrisma.user.findUnique.mockResolvedValueOnce(createMockUser({ id: 'target_1', role: 'SUPER_ADMIN' }))
    const { PATCH } = await import('@/app/api/admin/users/[id]/route')
    const response = await PATCH(patch('USER'), ctx)
    expect(response.status).toBe(400)
  })
})
