import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  heroSlide: { findMany: vi.fn() },
  product: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), groupBy: vi.fn(), fields: { price: 'price' } },
  category: { findMany: vi.fn() },
  promotionalBanner: { findMany: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

describe('toHeroSlides', () => {
  it('maps admin rows (ctaText/ctaLink) and product-derived rows alike', async () => {
    const { toHeroSlides } = await import('@/lib/server/storefront')

    const [admin, derived] = toHeroSlides([
      { id: 'a', title: 'Admin', image: '/a.jpg', ctaText: 'Browse', ctaLink: '/categories' },
      { id: 'b', title: 'Derived', image: '/b.jpg', type: 'sale', badge: '20% OFF', discount: 20, link: '/products/x', cta: 'Buy' },
    ])

    expect(admin).toMatchObject({ link: '/categories', cta: 'Browse', type: 'default', badge: null, product: null })
    expect(derived).toMatchObject({ link: '/products/x', cta: 'Buy', type: 'sale', discount: 20 })
  })

  it('leaves blank optional fields null so the hero omits them (no default button)', async () => {
    const { toHeroSlides } = await import('@/lib/server/storefront')
    expect(toHeroSlides([{ id: 'a', title: 'T', image: '/i.jpg', subtitle: '  ', ctaLink: '/x' }])[0]).toMatchObject({
      link: null,
      cta: null,
      subtitle: null,
      description: null,
    })
  })

  it('falls back to the catalogue when a button has a label but no link', async () => {
    const { toHeroSlides } = await import('@/lib/server/storefront')
    expect(toHeroSlides([{ id: 'a', title: 'T', image: '/i.jpg', ctaText: 'Shop' }])[0]).toMatchObject({
      link: '/products',
      cta: 'Shop',
    })
  })
})

describe('loadHeroSlides', () => {
  beforeEach(() => vi.clearAllMocks())

  it('serves admin banner slides without the product watermark', async () => {
    const { loadHeroSlides } = await import('@/lib/server/storefront')
    const url = 'https://res.cloudinary.com/demo/image/upload/v1760900000/saakie-byknk/hero-slides/banner.jpg'
    mockPrisma.heroSlide.findMany.mockResolvedValue([{ id: 'h1', title: 'Banner', image: url, isActive: true, order: 0 }])

    const [slide] = await loadHeroSlides()
    expect(slide.image).toBe(url)
    expect(mockPrisma.product.findMany).not.toHaveBeenCalled()
  })
})

describe('loadPromotionalStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds the three highlight cards from counts and one example each', async () => {
    mockPrisma.product.count
      .mockResolvedValueOnce(12) // best sellers
      .mockResolvedValueOnce(3) // on sale
      .mockResolvedValueOnce(5) // featured
    mockPrisma.product.findFirst
      .mockResolvedValueOnce({ name: 'Top', slug: 'top', price: 999, salesCount: 40 })
      .mockResolvedValueOnce({ name: 'Feat', slug: 'feat', category: { name: 'Silk' } })
    mockPrisma.product.findMany.mockResolvedValue([
      { name: 'Small deal', slug: 's', price: 90, comparePrice: 100 },
      { name: 'Big deal', slug: 'b', price: 50, comparePrice: 100 },
    ])

    const { loadPromotionalStats } = await import('@/lib/server/storefront')
    const stats = await loadPromotionalStats()

    expect(stats.bestSellers).toEqual({ count: 12, products: [{ name: 'Top', slug: 'top', price: 999, totalSales: 40 }] })
    expect(stats.saleProducts.count).toBe(3)
    expect(stats.saleProducts.maxDiscount).toBe(50)
    expect(stats.saleProducts.products[0].name).toBe('Big deal')
    expect(stats.featuredProducts).toEqual({ count: 5, products: [{ name: 'Feat', slug: 'feat', category: 'Silk' }] })
  })

  it('reports zero counts with no examples on an empty catalogue', async () => {
    mockPrisma.product.count.mockResolvedValue(0)
    mockPrisma.product.findFirst.mockResolvedValue(null)
    mockPrisma.product.findMany.mockResolvedValue([])

    const { loadPromotionalStats } = await import('@/lib/server/storefront')
    const stats = await loadPromotionalStats()

    expect(stats.bestSellers.products).toEqual([])
    expect(stats.saleProducts.maxDiscount).toBe(0)
    expect(stats.featuredProducts.count).toBe(0)
  })
})

describe('loadNewArrivals', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cuts off exactly fourteen days before now', async () => {
    const { newArrivalCutoff, NEW_ARRIVAL_WINDOW_DAYS } = await import('@/lib/server/storefront')
    expect(NEW_ARRIVAL_WINDOW_DAYS).toBe(14)
    expect(newArrivalCutoff(new Date('2026-10-20T12:00:00Z'))).toEqual(new Date('2026-10-06T12:00:00Z'))
  })

  it('asks only for active products created inside the window, newest first', async () => {
    const { loadNewArrivals } = await import('@/lib/server/storefront')
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'Fresh',
        slug: 'fresh',
        price: 1000,
        comparePrice: null,
        stock: 2,
        images: [{ url: 'https://example.com/a.jpg' }],
        colors: [{ hexCode: '#000' }, { hexCode: '#000' }],
        category: { name: 'Silk', slug: 'silk' },
        rating: 4.26,
        _count: { reviews: 3 },
      },
    ])

    const before = Date.now()
    const result = await loadNewArrivals()

    const args = mockPrisma.product.findMany.mock.calls[0][0]
    expect(args.where.isActive).toBe(true)
    expect(args.orderBy).toEqual({ createdAt: 'desc' })
    const gte: Date = args.where.createdAt.gte
    const fourteenDays = 14 * 24 * 60 * 60 * 1000
    expect(before - gte.getTime()).toBeGreaterThanOrEqual(fourteenDays - 1000)
    expect(before - gte.getTime()).toBeLessThan(fourteenDays + 5000)

    expect(result).toEqual([
      expect.objectContaining({ id: 'p1', rating: 4.3, reviews: 3, colors: ['#000'], inStock: true }),
    ])
  })

  it('returns an empty list when nothing was added recently', async () => {
    const { loadNewArrivals } = await import('@/lib/server/storefront')
    mockPrisma.product.findMany.mockResolvedValue([])
    expect(await loadNewArrivals()).toEqual([])
  })
})

describe('loadCategoryShelves', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Top-level categories, then the active tree used for subtree scoping.
    mockPrisma.category.findMany
      .mockResolvedValueOnce([
        { id: 'silk', name: 'Pure Silk', slug: 'pure-silk' },
        { id: 'empty', name: 'Linen', slug: 'linen' },
      ])
      .mockResolvedValue([
        { id: 'silk', parentId: null },
        { id: 'kanji', parentId: 'silk' },
        { id: 'empty', parentId: null },
      ])
  })

  it('returns a shelf per category with products, scoped to the subtree, and drops empty ones', async () => {
    mockPrisma.product.findMany.mockImplementation(({ where }: { where: { categoryId: { in: string[] } } }) =>
      Promise.resolve(
        where.categoryId.in.includes('silk')
          ? [{ id: 'p1', name: 'Kanjivaram', slug: 'kanji', price: 9000, comparePrice: null, stock: 2, createdAt: new Date(), rating: 4.5, salesCount: 20, images: [{ url: 'https://res.cloudinary.com/c/image/upload/v1/x.jpg' }], colors: [], category: { name: 'Kanjivaram', slug: 'kanjivaram' }, _count: { reviews: 3 } }]
          : []
      )
    )
    const { loadCategoryShelves, CATEGORY_SHELF_SIZE } = await import('@/lib/server/storefront')

    const shelves = await loadCategoryShelves()

    expect(shelves).toHaveLength(1)
    expect(shelves[0]).toMatchObject({ slug: 'pure-silk', name: 'Pure Silk' })
    expect(shelves[0].products[0]).toMatchObject({ slug: 'kanji', rating: 4.5 })
    // The silk shelf asks for silk and its sub-category; newest first, capped.
    const silkCall = mockPrisma.product.findMany.mock.calls.find((c) => c[0].where.categoryId.in.includes('silk'))
    expect(silkCall[0].where.categoryId.in).toEqual(expect.arrayContaining(['silk', 'kanji']))
    expect(silkCall[0]).toMatchObject({ take: CATEGORY_SHELF_SIZE, orderBy: { createdAt: 'desc' } })
  })
})
