import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
const mockPrisma = {
  category: {
    findMany: vi.fn(),
  },
  product: {
    groupBy: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

/**
 * The route makes two `category.findMany` calls — the nav query
 * (`parentId: null`, with children selected) and the flat tree load behind the
 * subtree rollup. Route them by their `where` clause so the tests don't depend
 * on call ordering.
 */
const mockCategories = (topLevel: unknown[], tree: unknown[]) => {
  mockPrisma.category.findMany.mockImplementation((args: any) =>
    Promise.resolve(args?.where?.parentId === null ? topLevel : tree)
  )
}

/** Direct product counts keyed by category id, as `product.groupBy` returns them. */
const mockProductCounts = (counts: Record<string, number>) => {
  mockPrisma.product.groupBy.mockResolvedValue(
    Object.entries(counts).map(([categoryId, n]) => ({
      categoryId,
      _count: { _all: n },
    }))
  )
}

const TOP_LEVEL = [
  {
    id: 'silk',
    name: 'Pure Silk',
    slug: 'pure-silk',
    children: [
      { id: 'kora', name: 'Kora Silk', slug: 'kora-silk' },
      { id: 'matka', name: 'Matka Silk', slug: 'matka-silk' },
    ],
  },
  { id: 'linen', name: 'Pure Linen', slug: 'pure-linen', children: [] },
  {
    id: 'chiffon',
    name: 'Chiffon',
    slug: 'chiffon',
    children: [{ id: 'handwork', name: 'Handwork Chiffon', slug: 'handwork-chiffon' }],
  },
]

const TREE = [
  { id: 'silk', parentId: null },
  { id: 'kora', parentId: 'silk' },
  { id: 'matka', parentId: 'silk' },
  { id: 'linen', parentId: null },
  { id: 'chiffon', parentId: null },
  { id: 'handwork', parentId: 'chiffon' },
]

const getNav = async () => {
  const { GET } = await import('@/app/api/categories/nav/route')
  const response = await GET()
  return { response, body: await response.json() }
}

describe('GET /api/categories/nav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCategories([], [])
    mockProductCounts({})
  })

  it('asks only for active categories', async () => {
    mockCategories(TOP_LEVEL, TREE)
    mockProductCounts({ kora: 3 })

    await getNav()

    const navCall = mockPrisma.category.findMany.mock.calls.find(
      ([args]: any) => args?.where?.parentId === null
    )
    expect(navCall?.[0].where).toMatchObject({ isActive: true, parentId: null })
    expect(navCall?.[0].select.children.where).toMatchObject({ isActive: true })
  })

  it('keeps a parent whose stock lives entirely in a sub-category', async () => {
    // Pure Silk has nothing filed directly against it — only Kora Silk does.
    mockCategories(TOP_LEVEL, TREE)
    mockProductCounts({ kora: 3 })

    const { body } = await getNav()

    expect(body).toEqual([
      {
        id: 'silk',
        name: 'Pure Silk',
        slug: 'pure-silk',
        count: 3,
        children: [{ id: 'kora', name: 'Kora Silk', slug: 'kora-silk', count: 3 }],
      },
    ])
  })

  it('drops sub-categories that have no products', async () => {
    mockCategories(TOP_LEVEL, TREE)
    mockProductCounts({ kora: 3, matka: 0 })

    const { body } = await getNav()

    expect(body[0].children.map((c: { slug: string }) => c.slug)).toEqual(['kora-silk'])
  })

  it('drops a category whose whole subtree is empty', async () => {
    // Chiffon and its only child both have nothing.
    mockCategories(TOP_LEVEL, TREE)
    mockProductCounts({ kora: 3 })

    const { body } = await getNav()

    expect(body.map((c: { slug: string }) => c.slug)).not.toContain('chiffon')
  })

  it('returns a stocked category with no sub-categories as an empty children list', async () => {
    mockCategories(TOP_LEVEL, TREE)
    mockProductCounts({ linen: 2 })

    const { body } = await getNav()

    expect(body).toEqual([
      { id: 'linen', name: 'Pure Linen', slug: 'pure-linen', count: 2, children: [] },
    ])
  })

  it('returns an empty tree when nothing has products', async () => {
    mockCategories(TOP_LEVEL, TREE)
    mockProductCounts({})

    const { response, body } = await getNav()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })
})
