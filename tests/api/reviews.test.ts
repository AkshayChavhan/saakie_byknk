import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockUser, createMockSession } from '../mocks/factories'

// Mock Auth.js — `auth()` resolves the session; `requireAuth()` then loads the
// user through Prisma.
const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// Mock Prisma. Review submission checks the product exists, that the user has
// not already reviewed it, and that they have a *paid* order for it.
const mockPrisma = {
  user: { findUnique: vi.fn() },
  product: { findUnique: vi.fn() },
  review: { findFirst: vi.fn(), create: vi.fn() },
  orderItem: { findFirst: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

function signIn(id = 'user_123') {
  mockAuth.mockResolvedValue(createMockSession({ id }))
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id }))
}

/** Default happy path: product exists, no prior review, a paid order exists. */
function eligible() {
  mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod_123' })
  mockPrisma.review.findFirst.mockResolvedValue(null)
  mockPrisma.orderItem.findFirst.mockResolvedValue({ id: 'item_1' })
}

const validReview = { productId: 'prod_123', rating: 5, title: 'Lovely', comment: 'Great fabric' }

function postReview(body: unknown = validReview) {
  return new NextRequest('http://localhost:3000/api/reviews', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('Reviews API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/reviews', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const { POST } = await import('@/app/api/reviews/route')
      const response = await POST(postReview())

      expect(response.status).toBe(401)
      expect(mockPrisma.review.create).not.toHaveBeenCalled()
    })

    it('rejects a reviewer who has not paid for the product', async () => {
      signIn()
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod_123' })
      mockPrisma.review.findFirst.mockResolvedValue(null)
      // No paid order item for this product.
      mockPrisma.orderItem.findFirst.mockResolvedValue(null)

      const { POST } = await import('@/app/api/reviews/route')
      const response = await POST(postReview())
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.reason).toBe('NOT_PURCHASED')
      expect(mockPrisma.review.create).not.toHaveBeenCalled()
    })

    it('only counts paid orders — unpaid ones do not unlock reviewing', async () => {
      signIn()
      eligible()
      mockPrisma.review.create.mockResolvedValue({ id: 'rev_1', status: 'PENDING' })

      const { POST } = await import('@/app/api/reviews/route')
      await POST(postReview())

      // The purchase lookup must filter to paid orders (or delivered COD),
      // not merely to any order the user placed.
      const where = mockPrisma.orderItem.findFirst.mock.calls[0][0].where
      expect(where.productId).toBe('prod_123')
      expect(where.order.userId).toBe('user_123')
      expect(where.order.OR).toEqual([
        { paymentStatus: 'PAID' },
        { paymentMethod: 'COD', status: 'DELIVERED' },
      ])
    })

    it('creates a pending, verified review for a paying customer', async () => {
      signIn()
      eligible()
      mockPrisma.review.create.mockResolvedValue({ id: 'rev_1', status: 'PENDING' })

      const { POST } = await import('@/app/api/reviews/route')
      const response = await POST(postReview())
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      const created = mockPrisma.review.create.mock.calls[0][0].data
      expect(created).toMatchObject({
        userId: 'user_123',
        productId: 'prod_123',
        rating: 5,
        isVerified: true,
        status: 'PENDING',
      })
    })

    it('returns 409 when the user already reviewed the product', async () => {
      signIn()
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod_123' })
      mockPrisma.review.findFirst.mockResolvedValue({ id: 'rev_existing' })

      const { POST } = await import('@/app/api/reviews/route')
      const response = await POST(postReview())
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.reason).toBe('ALREADY_REVIEWED')
      expect(mockPrisma.review.create).not.toHaveBeenCalled()
    })

    it('returns 404 for an unknown product', async () => {
      signIn()
      mockPrisma.product.findUnique.mockResolvedValue(null)
      mockPrisma.review.findFirst.mockResolvedValue(null)

      const { POST } = await import('@/app/api/reviews/route')
      const response = await POST(postReview())
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.reason).toBe('PRODUCT_NOT_FOUND')
    })

    it('rejects an out-of-range rating before any purchase lookup', async () => {
      signIn()
      eligible()

      const { POST } = await import('@/app/api/reviews/route')
      const response = await POST(postReview({ ...validReview, rating: 9 }))

      expect(response.status).toBe(400)
      expect(mockPrisma.orderItem.findFirst).not.toHaveBeenCalled()
      expect(mockPrisma.review.create).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/reviews/eligibility', () => {
    const get = (url = 'http://localhost:3000/api/reviews/eligibility?productId=prod_123') =>
      import('@/app/api/reviews/eligibility/route').then(({ GET }) => GET(new NextRequest(url)))

    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      expect((await get()).status).toBe(401)
    })

    it('returns 400 without a productId', async () => {
      signIn()
      const response = await get('http://localhost:3000/api/reviews/eligibility')
      expect(response.status).toBe(400)
    })

    it('reports eligibility for a paying customer', async () => {
      signIn()
      eligible()

      const data = await (await get()).json()

      expect(data).toMatchObject({ canReview: true, reason: 'OK' })
    })

    it('reports NOT_PURCHASED for a user without a paid order', async () => {
      signIn()
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod_123' })
      mockPrisma.review.findFirst.mockResolvedValue(null)
      mockPrisma.orderItem.findFirst.mockResolvedValue(null)

      const data = await (await get()).json()

      expect(data.canReview).toBe(false)
      expect(data.reason).toBe('NOT_PURCHASED')
      expect(data.message).toMatch(/purchased/i)
    })
  })
})
