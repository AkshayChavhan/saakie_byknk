import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockUser, createMockProduct, createMockOrder, createMockSession } from '../../mocks/factories'

// Mock Auth.js — `auth()` resolves the session (or null when signed out).
// requireAuth() reads session.user.id then loads the user via Prisma.
const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// Mock Prisma (the route imports the singleton default export from @/lib/prisma).
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  order: {
    count: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  product: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

/**
 * Wire up the full set of Prisma calls the route's `Promise.all` makes, so a
 * dashboard request resolves. Order matters only for the two `findMany`/`count`
 * calls that are distinguished by call order:
 *  - order.count: [0] total, [1] pending
 *  - product.count: [0] total active, [1] low stock
 *  - order.findMany: [0] monthlyOrders ({total}), [1] recentOrders
 *  - user.count: total, newThisMonth, activeUsers (all return the same here)
 */
function mockDashboardData({
  monthlyOrders = [{ total: 0 }],
  topProducts = [],
  recentOrders = [],
  totalRevenue = 0,
} = {}) {
  mockPrisma.user.count.mockResolvedValue(0)
  mockPrisma.order.count.mockResolvedValue(0)
  mockPrisma.product.count.mockResolvedValue(0)
  mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: totalRevenue } })
  mockPrisma.order.findMany
    .mockResolvedValueOnce(monthlyOrders) // monthlyOrders (select: { total })
    .mockResolvedValueOnce(recentOrders) // recentOrders
  mockPrisma.product.findMany.mockResolvedValue(topProducts)
}

function signInAs(role: string) {
  mockAuth.mockResolvedValue(createMockSession({ id: 'user_123', role }))
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role }))
}

describe('Admin Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/dashboard', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.message).toBe('Unauthorized - No session')
    })

    it('returns 403 when user is not admin', async () => {
      signInAs('USER')

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error.message).toBe('Forbidden - Admin access required')
    })

    it('returns 404 when user not found', async () => {
      mockAuth.mockResolvedValue(createMockSession({ id: 'user_123' }))
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()

      expect(response.status).toBe(404)
    })

    it('returns dashboard statistics for ADMIN user', async () => {
      signInAs('ADMIN')
      mockPrisma.user.count.mockResolvedValue(100)
      mockPrisma.order.count
        .mockResolvedValueOnce(50) // total orders
        .mockResolvedValueOnce(5) // pending orders
      mockPrisma.product.count
        .mockResolvedValueOnce(200) // total products
        .mockResolvedValueOnce(10) // low stock products
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 500000 } })
      // monthlyRevenue is summed from monthlyOrders (a findMany of { total }).
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ total: 30000 }, { total: 20000 }]) // monthlyOrders → 50000
        .mockResolvedValueOnce([createMockOrder()]) // recentOrders
      mockPrisma.product.findMany.mockResolvedValue([
        createMockProduct({ _count: { orderItems: 20 } }),
      ])

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.totalUsers).toBe(100)
      expect(data.totalOrders).toBe(50)
      expect(data.totalProducts).toBe(200)
      expect(data.totalRevenue).toBe(500000)
      expect(data.monthlyRevenue).toBe(50000)
      expect(data.pendingOrders).toBe(5)
    })

    it('returns dashboard statistics for SUPER_ADMIN user', async () => {
      signInAs('SUPER_ADMIN')
      mockDashboardData()

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()

      expect(response.status).toBe(200)
    })

    it('returns zero revenue when no paid orders', async () => {
      signInAs('ADMIN')
      mockDashboardData({ monthlyOrders: [], totalRevenue: null })

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()
      const data = await response.json()

      expect(data.totalRevenue).toBe(0)
      expect(data.monthlyRevenue).toBe(0)
    })

    it('includes top products', async () => {
      signInAs('ADMIN')
      mockDashboardData({
        topProducts: [
          { id: 'prod_1', name: 'Top Product', price: 5999, stock: 10, images: [], _count: { orderItems: 50 } },
          { id: 'prod_2', name: 'Second Product', price: 4999, stock: 5, images: [], _count: { orderItems: 30 } },
        ],
      })

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()
      const data = await response.json()

      expect(data.topProducts).toBeDefined()
      expect(data.topProducts.length).toBeLessThanOrEqual(5)
    })

    it('includes recent orders', async () => {
      signInAs('ADMIN')
      mockDashboardData({
        recentOrders: [
          { id: 'order_1', orderNumber: 'ORD-001', total: 5999, status: 'PENDING', createdAt: new Date(), user: { name: 'Test User', email: 'test@test.com' } },
        ],
      })

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()
      const data = await response.json()

      expect(data.recentOrders).toBeDefined()
      expect(data.recentOrders.length).toBeLessThanOrEqual(5)
    })

    it('treats an auth-time database error as 401', async () => {
      mockAuth.mockResolvedValue(createMockSession({ id: 'user_123' }))
      // Thrown inside requireAuth's user lookup → caught there, returns 401.
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()

      expect(response.status).toBe(401)
    })

    it('returns 500 when a post-auth query fails', async () => {
      signInAs('ADMIN')
      mockPrisma.user.count.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
