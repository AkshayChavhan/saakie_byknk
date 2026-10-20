// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSession, createMockUser } from '../../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

const tx = {
  product: { update: vi.fn() },
  image: { deleteMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  color: { deleteMany: vi.fn(), createMany: vi.fn() },
  size: { deleteMany: vi.fn(), createMany: vi.fn() },
}
const mockPrisma = {
  user: { findUnique: vi.fn() },
  product: { findUnique: vi.fn() },
  $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))
vi.mock('@/lib/cloudinary', () => ({
  uploadImage: vi.fn(),
  deleteFromCloudinary: vi.fn().mockResolvedValue(undefined),
}))

const A = 'a'.repeat(24)
const B = 'b'.repeat(24)
const C = 'c'.repeat(24)
const ctx = { params: Promise.resolve({ id: 'prod_1' }) }

const existing = {
  id: 'prod_1',
  slug: 'saree',
  images: [
    { id: A, publicId: 'pa', isPrimary: true, order: 0 },
    { id: B, publicId: 'pb', isPrimary: false, order: 1 },
    { id: C, publicId: 'pc', isPrimary: false, order: 2 },
  ],
}

function patch(fields: Record<string, string>) {
  const body = new FormData()
  body.set('data', JSON.stringify({ name: 'Saree' }))
  for (const [k, v] of Object.entries(fields)) body.set(k, v)
  return new NextRequest('http://localhost:3000/api/admin/products/prod_1', { method: 'PATCH', body })
}

describe('PATCH /api/admin/products/[id] image sequence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(createMockSession({ id: 'admin_1' }))
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'admin_1', role: 'ADMIN' }))
    mockPrisma.product.findUnique.mockResolvedValue(existing)
    mockPrisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx))
  })

  it('stores each image\'s position and makes the first one the main photo', async () => {
    const { PATCH } = await import('@/app/api/admin/products/[id]/route')
    const response = await PATCH(
      patch({ removedImageIds: JSON.stringify([B]), imageOrder: JSON.stringify([C, A, B]) }),
      ctx
    )

    expect(response.status).toBe(200)
    expect(tx.image.deleteMany).toHaveBeenCalledWith({ where: { productId: 'prod_1', id: { in: [B] } } })
    // C leads, then A; the removed B takes no position.
    expect(tx.image.update).toHaveBeenCalledTimes(2)
    expect(tx.image.update).toHaveBeenNthCalledWith(1, { where: { id: C }, data: { order: 0, isPrimary: true } })
    expect(tx.image.update).toHaveBeenNthCalledWith(2, { where: { id: A }, data: { order: 1, isPrimary: false } })
  })

  it('appends a surviving image the order forgot instead of losing it', async () => {
    const { PATCH } = await import('@/app/api/admin/products/[id]/route')
    await PATCH(patch({ removedImageIds: '[]', imageOrder: JSON.stringify([B]) }), ctx)

    const written = tx.image.update.mock.calls.map((c) => c[0].where.id)
    expect(written).toEqual([B, A, C])
  })

  it('reads the product back with its images in display order', async () => {
    const { PATCH } = await import('@/app/api/admin/products/[id]/route')
    await PATCH(patch({ removedImageIds: '[]', imageOrder: JSON.stringify([A, B, C]) }), ctx)

    const lastRead = mockPrisma.product.findUnique.mock.calls.at(-1)![0]
    expect(lastRead.include.images).toEqual({
      orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
    })
  })

  it('still honours primaryImageId when no sequence is sent (older clients)', async () => {
    const { PATCH } = await import('@/app/api/admin/products/[id]/route')
    await PATCH(patch({ removedImageIds: '[]', primaryImageId: C }), ctx)

    expect(tx.image.updateMany).toHaveBeenCalledWith({ where: { productId: 'prod_1' }, data: { isPrimary: false } })
    expect(tx.image.update).toHaveBeenCalledWith({ where: { id: C }, data: { isPrimary: true } })
  })

  it('ignores a malformed sequence rather than writing garbage', async () => {
    const { PATCH } = await import('@/app/api/admin/products/[id]/route')
    await PATCH(patch({ removedImageIds: '[]', imageOrder: '[{"$ne":1}]' }), ctx)

    // Falls back to the legacy path: main image = first remaining.
    expect(tx.image.update).toHaveBeenCalledWith({ where: { id: A }, data: { isPrimary: true } })
    expect(tx.image.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ order: expect.anything() }) }))
  })
})
