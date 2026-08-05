import { describe, it, expect, vi, beforeEach } from 'vitest'

// The routes read the singleton client from `@/lib/prisma` (default export).
const mockPrisma = {
  blogPost: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

const post = (overrides: Record<string, unknown> = {}) => ({
  id: 'post_1',
  title: 'The Timeless Elegance of Sarees',
  slug: 'timeless-elegance',
  excerpt: 'Why the saree endures.',
  content: '## Heading\n\nBody text.',
  category: 'Culture & Heritage',
  image: 'https://res.cloudinary.com/x.jpg',
  authorName: 'Saakie by KNK',
  readMinutes: 4,
  isPublished: true,
  isFeatured: false,
  publishedAt: new Date('2024-01-25T00:00:00.000Z'),
  ...overrides,
})

describe('Public Blog API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.blogPost.findMany.mockResolvedValue([])
    mockPrisma.blogPost.findFirst.mockResolvedValue(null)
  })

  describe('GET /api/blog', () => {
    it('returns the published posts', async () => {
      mockPrisma.blogPost.findMany.mockResolvedValue([post()])

      const { GET } = await import('@/app/api/blog/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].slug).toBe('timeless-elegance')
    })

    it('filters to published posts only', async () => {
      const { GET } = await import('@/app/api/blog/route')
      await GET()

      expect(mockPrisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } })
      )
    })

    it('leaves the post body out of the list payload', async () => {
      // Bodies are large and no card renders them; shipping every one would
      // make the index payload grow without bound as posts are added.
      const { GET } = await import('@/app/api/blog/route')
      await GET()

      const { select } = mockPrisma.blogPost.findMany.mock.calls[0][0]
      expect(select).toBeDefined()
      expect(select.content).toBeUndefined()
      expect(select.title).toBe(true)
      expect(select.excerpt).toBe(true)
    })

    it('orders newest first, falling back to creation time', async () => {
      const { GET } = await import('@/app/api/blog/route')
      await GET()

      expect(mockPrisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        })
      )
    })

    it('returns an empty array when nothing is published', async () => {
      const { GET } = await import('@/app/api/blog/route')
      const response = await GET()

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual([])
    })
  })

  describe('GET /api/blog/[slug]', () => {
    const call = async (slug: string) => {
      const { GET } = await import('@/app/api/blog/[slug]/route')
      return GET(new Request(`http://localhost/api/blog/${slug}`), {
        params: Promise.resolve({ slug }),
      })
    }

    it('returns the post with its related reads', async () => {
      mockPrisma.blogPost.findFirst.mockResolvedValue(post())
      mockPrisma.blogPost.findMany.mockResolvedValue([
        post({ id: 'post_2', slug: 'other' }),
      ])

      const response = await call('timeless-elegance')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.post.slug).toBe('timeless-elegance')
      expect(data.post.content).toBe('## Heading\n\nBody text.')
      expect(data.related).toHaveLength(1)
    })

    it('404s for a slug that does not exist', async () => {
      mockPrisma.blogPost.findFirst.mockResolvedValue(null)

      const response = await call('nope')

      expect(response.status).toBe(404)
      expect((await response.json()).error).toBe('Blog post not found')
    })

    it('404s for a draft rather than revealing it exists', async () => {
      // The published filter lives in the query, so an unpublished slug is
      // indistinguishable from a missing one.
      mockPrisma.blogPost.findFirst.mockResolvedValue(null)

      const response = await call('secret-draft')

      expect(response.status).toBe(404)
      expect(mockPrisma.blogPost.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'secret-draft', isPublished: true } })
      )
    })

    it('caps related reads at three and excludes the post itself', async () => {
      mockPrisma.blogPost.findFirst.mockResolvedValue(post())

      await call('timeless-elegance')

      expect(mockPrisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublished: true, id: { not: 'post_1' } },
          take: 3,
        })
      )
    })

    it('leaves the body out of the related reads', async () => {
      mockPrisma.blogPost.findFirst.mockResolvedValue(post())

      await call('timeless-elegance')

      const { select } = mockPrisma.blogPost.findMany.mock.calls[0][0]
      expect(select.content).toBeUndefined()
    })
  })
})
