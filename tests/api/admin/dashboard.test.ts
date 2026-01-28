import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockUser, createMockProduct, createMockOrder } from '../../mocks/factories'

// Mock Clerk auth
const mockAuth = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}))

// Mock Prisma
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
    fields: {
      lowStockAlert: 10,
    },
  },
  $disconnect: vi.fn(),
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}))

describe('Admin Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/dashboard', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 403 when user is not admin', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ role: 'USER' })
      )

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Forbidden')
    })

    it('returns 403 when user not found', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()

      expect(response.status).toBe(403)
    })

    it('returns dashboard statistics for ADMIN user', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ role: 'ADMIN' })
      )
      mockPrisma.user.count.mockResolvedValue(100)
      mockPrisma.order.count
        .mockResolvedValueOnce(50) // total orders
        .mockResolvedValueOnce(5) // pending orders
      mockPrisma.product.count
        .mockResolvedValueOnce(200) // total products
        .mockResolvedValueOnce(10) // low stock products
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: 500000 } }) // total revenue
        .mockResolvedValueOnce({ _sum: { total: 50000 } }) // monthly revenue
      mockPrisma.product.findMany.mockResolvedValue([
        createMockProduct({ _count: { orderItems: 20 } }),
      ])
      mockPrisma.order.findMany.mockResolvedValue([
        createMockOrder(),
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
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ role: 'SUPER_ADMIN' })
      )
      mockPrisma.user.count.mockResolvedValue(50)
      mockPrisma.order.count.mockResolvedValue(25)
      mockPrisma.product.count.mockResolvedValue(100)
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 100000 } })
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()

      expect(response.status).toBe(200)
    })

    it('returns zero revenue when no paid orders', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ role: 'ADMIN' })
      )
      mockPrisma.user.count.mockResolvedValue(10)
      mockPrisma.order.count.mockResolvedValue(0)
      mockPrisma.product.count.mockResolvedValue(0)
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: null } })
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()
      const data = await response.json()

      expect(data.totalRevenue).toBe(0)
      expect(data.monthlyRevenue).toBe(0)
    })

    it('includes top products', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ role: 'ADMIN' })
      )
      mockPrisma.user.count.mockResolvedValue(10)
      mockPrisma.order.count.mockResolvedValue(5)
      mockPrisma.product.count.mockResolvedValue(20)
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 10000 } })
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'prod_1', name: 'Top Product', price: 5999, stock: 10, images: [], _count: { orderItems: 50 } },
        { id: 'prod_2', name: 'Second Product', price: 4999, stock: 5, images: [], _count: { orderItems: 30 } },
      ])
      mockPrisma.order.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()
      const data = await response.json()

      expect(data.topProducts).toBeDefined()
      expect(data.topProducts.length).toBeLessThanOrEqual(5)
    })

    it('includes recent orders', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ role: 'ADMIN' })
      )
      mockPrisma.user.count.mockResolvedValue(10)
      mockPrisma.order.count.mockResolvedValue(5)
      mockPrisma.product.count.mockResolvedValue(20)
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 10000 } })
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'order_1', orderNumber: 'ORD-001', total: 5999, status: 'PENDING', createdAt: new Date(), user: { name: 'Test User', email: 'test@test.com' } },
      ])

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()
      const data = await response.json()

      expect(data.recentOrders).toBeDefined()
      expect(data.recentOrders.length).toBeLessThanOrEqual(5)
    })

    it('handles database errors', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('@/app/api/admin/dashboard/route')
      const response = await GET()

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Internal server error')
    })

    it('disconnects from database after query', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ role: 'ADMIN' })
      )
      mockPrisma.user.count.mockResolvedValue(0)
      mockPrisma.order.count.mockResolvedValue(0)
      mockPrisma.product.count.mockResolvedValue(0)
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 0 } })
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/dashboard/route')
      await GET()

      expect(mockPrisma.$disconnect).toHaveBeenCalled()
    })
  })
})
