import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSession, createMockUser } from '../../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

const mockPrisma = {
  user: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
  order: { count: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

const list = (query = '') =>
  new NextRequest(`http://localhost:3000/api/admin/users${query ? `?${query}` : ''}`)

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(createMockSession({ id: 'admin_1' }))
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'admin_1', role: 'SUPER_ADMIN' }))
    mockPrisma.user.findMany.mockResolvedValue([])
    mockPrisma.user.count.mockResolvedValue(1)
    mockPrisma.order.count.mockResolvedValue(57)
    mockPrisma.user.groupBy.mockResolvedValue([
      { role: 'USER', _count: { _all: 120 } },
      { role: 'ADMIN', _count: { _all: 3 } },
    ])
  })

  it('refuses an ADMIN: customer details are SUPER_ADMIN only', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'admin_1', role: 'ADMIN' }))
    const { GET } = await import('@/app/api/admin/users/route')
    const response = await GET()

    expect(response.status).toBe(403)
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled()
  })

  it('filters by role on the server and reports directory-wide counts', async () => {
    const { GET } = await import('@/app/api/admin/users/route')
    const response = await GET(list('role=ADMIN&search=ak&page=1&limit=10'))
    const body = await response.json()

    expect(response.status).toBe(200)
    const { where } = mockPrisma.user.findMany.mock.calls[0][0]
    expect(where.role).toBe('ADMIN')
    expect(where.OR[1]).toEqual({ name: { contains: 'ak', mode: 'insensitive' } })
    expect(body.stats).toEqual({ total: 123, USER: 120, ADMIN: 3, SUPER_ADMIN: 0, orders: 57 })
    expect(body.pagination.totalCount).toBe(1)
  })

  it('ignores an unknown role value', async () => {
    const { GET } = await import('@/app/api/admin/users/route')
    await GET(list('role=OWNER'))
    expect(mockPrisma.user.findMany.mock.calls[0][0].where).toEqual({})
  })
})
