import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  heroSlide: { findMany: vi.fn() },
  product: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), count: vi.fn(), groupBy: vi.fn(), fields: { price: 'price' } },
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

describe('heroSlideSets', () => {
  const row = (id: string, device?: 'DESKTOP' | 'MOBILE') => ({ id, title: id, image: `/${id}.jpg`, device })

  it('puts each admin slide in the set it was uploaded for', async () => {
    const { heroSlideSets } = await import('@/lib/server/storefront')
    const sets = heroSlideSets([row('d1', 'DESKTOP'), row('m1', 'MOBILE'), row('d2', 'DESKTOP')])
    expect(sets.DESKTOP.map((s) => s.id)).toEqual(['d1', 'd2'])
    expect(sets.MOBILE.map((s) => s.id)).toEqual(['m1'])
  })

  it('shows product-derived slides (no device) on both', async () => {
    const { heroSlideSets } = await import('@/lib/server/storefront')
    const sets = heroSlideSets([row('p1'), row('p2')])
    expect(sets.DESKTOP.map((s) => s.id)).toEqual(['p1', 'p2'])
    expect(sets.MOBILE.map((s) => s.id)).toEqual(['p1', 'p2'])
  })

  it('lets an empty set borrow the other so no screen gets a blank hero', async () => {
    const { heroSlideSets } = await import('@/lib/server/storefront')
    const onlyDesktop = heroSlideSets([row('d1', 'DESKTOP')])
    expect(onlyDesktop.MOBILE.map((s) => s.id)).toEqual(['d1'])
    const onlyMobile = heroSlideSets([row('m1', 'MOBILE')])
    expect(onlyMobile.DESKTOP.map((s) => s.id)).toEqual(['m1'])
    expect(heroSlideSets([])).toEqual({ DESKTOP: [], MOBILE: [] })
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

describe('loadBestDeal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('picks the biggest discount across every product on sale', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'small', price: 90, comparePrice: 100 },
      { id: 'big', price: 79, comparePrice: 100 },
      { id: 'mid', price: 85, comparePrice: 100 },
    ])
    mockPrisma.product.findUnique.mockResolvedValue({
      name: 'Floral Handwork Saree',
      slug: 'floral',
      price: 79,
      comparePrice: 100,
      images: [{ url: 'https://example.com/floral.jpg' }],
      category: { name: 'Chiffon' },
    })

    const { loadBestDeal } = await import('@/lib/server/storefront')
    const deal = await loadBestDeal()

    expect(mockPrisma.product.findUnique.mock.calls[0][0].where).toEqual({ id: 'big' })
    expect(deal).toMatchObject({
      name: 'Floral Handwork Saree',
      slug: 'floral',
      discount: 21,
      price: 79,
      comparePrice: 100,
      image: 'https://example.com/floral.jpg',
      category: 'Chiffon',
      saleCount: 3,
    })
  })

  it('keeps the newest product on a tie', async () => {
    // Newest first, as the query orders them.
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'newer', price: 80, comparePrice: 100 },
      { id: 'older', price: 80, comparePrice: 100 },
    ])
    mockPrisma.product.findUnique.mockResolvedValue({
      name: 'N', slug: 'n', price: 80, comparePrice: 100, images: [], category: null,
    })

    const { loadBestDeal } = await import('@/lib/server/storefront')
    const deal = await loadBestDeal()

    expect(mockPrisma.product.findUnique.mock.calls[0][0].where).toEqual({ id: 'newer' })
    expect(deal?.image).toBeNull()
  })

  it('returns null when nothing is on sale', async () => {
    mockPrisma.product.findMany.mockResolvedValue([])

    const { loadBestDeal } = await import('@/lib/server/storefront')
    expect(await loadBestDeal()).toBeNull()
    expect(mockPrisma.product.findUnique).not.toHaveBeenCalled()
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
