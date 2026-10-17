import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  category: { findUnique: vi.fn(), findMany: vi.fn() },
  product: { groupBy: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

describe('loadCategoryDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Tree: parent -> child; 3 products on the child, none on the parent.
    mockPrisma.category.findMany.mockResolvedValue([
      { id: 'parent', parentId: null },
      { id: 'child', parentId: 'parent' },
    ])
    mockPrisma.product.groupBy.mockResolvedValue([{ categoryId: 'child', _count: { _all: 3 } }])
  })

  it('returns the category with subtree counts and sub-category tiles, no products', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({
      id: 'parent',
      name: 'Silk',
      slug: 'silk',
      description: null,
      image: null,
      isActive: true,
      children: [{ id: 'child', name: 'Banarasi', slug: 'banarasi', image: null }],
    })
    const { loadCategoryDetail } = await import('@/lib/server/categories')

    const detail = await loadCategoryDetail('silk')

    expect(detail).toMatchObject({ slug: 'silk', productCount: 3 })
    expect(detail?.children).toEqual([
      { id: 'child', name: 'Banarasi', slug: 'banarasi', image: '/images/placeholder-category.svg', count: 3 },
    ])
    expect(detail).not.toHaveProperty('products')
    // No product page is loaded just to be discarded.
    expect(mockPrisma.category.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.not.objectContaining({ products: expect.anything() }) })
    )
  })

  it('treats an inactive or unknown category as missing', async () => {
    mockPrisma.category.findUnique.mockResolvedValueOnce({ id: 'x', isActive: false, children: [] })
    const { loadCategoryDetail } = await import('@/lib/server/categories')
    expect(await loadCategoryDetail('hidden')).toBeNull()

    mockPrisma.category.findUnique.mockResolvedValueOnce(null)
    expect(await loadCategoryDetail('nope')).toBeNull()
  })
})
