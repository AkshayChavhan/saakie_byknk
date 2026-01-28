import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockUser, createMockOrder, createMockAddress, createMockProduct } from '../mocks/factories'

// Mock Clerk auth
const mockAuth = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}))

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  order: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  address: {
    create: vi.fn(),
  },
  product: {
    update: vi.fn(),
  },
  $disconnect: vi.fn(),
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}))

describe('Orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/orders', () => {
    const validOrderData = {
      productId: 'prod_123',
      productName: 'Silk Saree',
      selectedColor: 'Red',
      selectedSize: 'Free Size',
      quantity: 1,
      price: 5999,
      total: 5999,
      name: 'Test User',
      phone: '+919876543210',
      address: '123 Main St',
      city: 'Mumbai',
      pincode: '400001',
      paymentMethod: 'COD',
    }

    it('creates order for guest user', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const mockAddress = createMockAddress({ id: 'addr_123' })
      const mockOrder = createMockOrder({ id: 'order_123', orderNumber: 'COD123456' })

      mockPrisma.address.create.mockResolvedValue(mockAddress)
      mockPrisma.order.create.mockResolvedValue({
        ...mockOrder,
        items: [],
        shippingAddress: mockAddress,
      })
      mockPrisma.product.update.mockResolvedValue({})

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.order).toBeDefined()
      expect(data.order.orderNumber).toBeDefined()
    })

    it('creates order for authenticated user', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_123' })
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_123' }))

      const mockAddress = createMockAddress({ id: 'addr_123', userId: 'user_123' })
      const mockOrder = createMockOrder({ id: 'order_123', userId: 'user_123' })

      mockPrisma.address.create.mockResolvedValue(mockAddress)
      mockPrisma.order.create.mockResolvedValue({
        ...mockOrder,
        items: [],
        shippingAddress: mockAddress,
      })
      mockPrisma.product.update.mockResolvedValue({})

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('generates unique order number', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      mockPrisma.address.create.mockResolvedValue(createMockAddress())
      mockPrisma.order.create.mockResolvedValue({
        ...createMockOrder(),
        orderNumber: 'COD1234567890',
        items: [],
        shippingAddress: createMockAddress(),
      })
      mockPrisma.product.update.mockResolvedValue({})

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(data.order.orderNumber).toMatch(/^COD\d+/)
    })

    it('decrements product stock after order', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      mockPrisma.address.create.mockResolvedValue(createMockAddress())
      mockPrisma.order.create.mockResolvedValue({
        ...createMockOrder(),
        items: [],
        shippingAddress: createMockAddress(),
      })
      mockPrisma.product.update.mockResolvedValue({})

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify({ ...validOrderData, quantity: 2 }),
      })
      await POST(request)

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod_123' },
        data: {
          stock: { decrement: 2 },
        },
      })
    })

    it('stores color and size in order notes', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      mockPrisma.address.create.mockResolvedValue(createMockAddress())
      mockPrisma.order.create.mockResolvedValue({
        ...createMockOrder(),
        items: [],
        shippingAddress: createMockAddress(),
      })
      mockPrisma.product.update.mockResolvedValue({})

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      await POST(request)

      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining('Red'),
          }),
        })
      )
    })

    it('handles database errors', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      mockPrisma.address.create.mockRejectedValue(new Error('Database error'))

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create order')
    })

    it('handles foreign key constraint errors', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      mockPrisma.address.create.mockResolvedValue(createMockAddress())
      mockPrisma.order.create.mockRejectedValue(new Error('Foreign key constraint failed'))

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Product not found or invalid data')
    })

    it('disconnects from database after operation', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      mockPrisma.address.create.mockResolvedValue(createMockAddress())
      mockPrisma.order.create.mockResolvedValue({
        ...createMockOrder(),
        items: [],
        shippingAddress: createMockAddress(),
      })
      mockPrisma.product.update.mockResolvedValue({})

      const { POST } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders', {
        method: 'POST',
        body: JSON.stringify(validOrderData),
      })
      await POST(request)

      expect(mockPrisma.$disconnect).toHaveBeenCalled()
    })
  })

  describe('GET /api/orders', () => {
    it('returns all orders', async () => {
      const orders = [
        createMockOrder({ id: 'order_1' }),
        createMockOrder({ id: 'order_2' }),
      ]
      mockPrisma.order.findMany.mockResolvedValue(orders)

      const { GET } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('filters by status', async () => {
      mockPrisma.order.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders?status=PENDING')
      await GET(request)

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
        })
      )
    })

    it('filters by payment status', async () => {
      mockPrisma.order.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders?paymentStatus=PAID')
      await GET(request)

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { paymentStatus: 'PAID' },
        })
      )
    })

    it('orders by creation date descending', async () => {
      mockPrisma.order.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders')
      await GET(request)

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('limits results to 50', async () => {
      mockPrisma.order.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders')
      await GET(request)

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      )
    })

    it('handles database errors', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('Database error'))

      const { GET } = await import('@/app/api/orders/route')
      const request = new NextRequest('http://localhost:3000/api/orders')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch orders')
    })
  })
})
