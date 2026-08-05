import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockUser, createMockSession } from '../../mocks/factories'

// Auth.js — `auth()` resolves the session (or null when signed out).
// requireAuth() reads session.user.id then loads the user via Prisma, so
// signInAs has to set the role in both places.
const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

const mockPrisma = {
  blogPost: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  },
  user: { findUnique: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

const mockUploadImage = vi.fn()
const mockDeleteFromCloudinary = vi.fn()
vi.mock('@/lib/cloudinary', () => ({
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
  deleteFromCloudinary: (...args: unknown[]) => mockDeleteFromCloudinary(...args),
}))

function signInAs(role: string) {
  mockAuth.mockResolvedValue(createMockSession({ id: 'user_123', role }))
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role }))
}

/**
 * A stand-in for a multipart Request.
 *
 * jsdom's `File` is not the one undici's `Request.formData()` knows how to
 * read, so building a real Request around a FormData carrying a File hangs
 * forever. The routes only ever call `request.formData()`, so handing them the
 * FormData directly exercises the same code path without the stream.
 */
const multipart = (fields: Record<string, unknown>, image?: File): Request => {
  const form = new FormData()
  form.append('data', JSON.stringify(fields))
  if (image) form.append('image', image)
  return { formData: async () => form } as unknown as Request
}

/**
 * A cover-image upload.
 *
 * jsdom's File implements no `arrayBuffer()` — the routes call it to build the
 * Cloudinary buffer, so without this the upload path throws before it starts.
 * The instance is still a real File, so the routes' `instanceof File` check and
 * `validateImageFile` behave exactly as they do in production.
 */
const coverImage = (name = 'cover.jpg', type = 'image/jpeg'): File => {
  const file = new File(['cover-bytes'], name, { type })
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => new TextEncoder().encode('cover-bytes').buffer,
  })
  return file
}

const VALID = {
  title: 'The Art of Draping',
  slug: 'art-of-draping',
  excerpt: 'Eighty ways to wear six yards.',
  content: 'Body copy about draping.',
  category: 'Style Tips',
}

const existingPost = (overrides: Record<string, unknown> = {}) => ({
  id: 'post_1',
  title: 'Existing',
  slug: 'existing',
  excerpt: 'e',
  content: 'c',
  category: 'Culture & Heritage',
  image: null,
  imagePublicId: null,
  authorName: null,
  readMinutes: 1,
  isPublished: false,
  isFeatured: false,
  publishedAt: null,
  ...overrides,
})

const params = (id = 'post_1') => ({ params: Promise.resolve({ id }) })

describe('Admin Blog API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signInAs('ADMIN')
    mockPrisma.blogPost.findMany.mockResolvedValue([])
    mockPrisma.blogPost.findUnique.mockResolvedValue(null)
    mockPrisma.blogPost.findFirst.mockResolvedValue(null)
    mockPrisma.blogPost.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'post_new', ...data })
    )
    mockPrisma.blogPost.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'post_1', ...data })
    )
    mockPrisma.blogPost.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.blogPost.delete.mockResolvedValue({})
    mockUploadImage.mockResolvedValue({ url: 'https://res.cloudinary.com/new.jpg', publicId: 'blog/new' })
    mockDeleteFromCloudinary.mockResolvedValue({})
  })

  describe('authorization', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const { GET } = await import('@/app/api/admin/blog/route')
      const response = await GET()

      expect(response.status).toBe(401)
      expect((await response.json()).error.message).toBe('Unauthorized - No session')
    })

    it('returns 403 for a signed-in shopper', async () => {
      signInAs('USER')

      const { GET } = await import('@/app/api/admin/blog/route')
      const response = await GET()

      expect(response.status).toBe(403)
      expect((await response.json()).error.message).toBe('Forbidden - Admin access required')
    })

    it('allows ADMIN', async () => {
      signInAs('ADMIN')

      const { GET } = await import('@/app/api/admin/blog/route')

      expect((await GET()).status).toBe(200)
    })

    it('allows SUPER_ADMIN', async () => {
      signInAs('SUPER_ADMIN')

      const { GET } = await import('@/app/api/admin/blog/route')

      expect((await GET()).status).toBe(200)
    })

    it('guards the write routes too', async () => {
      signInAs('USER')

      const { POST } = await import('@/app/api/admin/blog/route')
      const { PATCH, DELETE } = await import('@/app/api/admin/blog/[id]/route')

      expect((await POST(multipart(VALID))).status).toBe(403)
      expect((await PATCH(multipart({ title: 'x' }), params())).status).toBe(403)
      expect((await DELETE({} as Request, params())).status).toBe(403)
    })
  })

  describe('GET /api/admin/blog', () => {
    it('returns drafts alongside published posts', async () => {
      mockPrisma.blogPost.findMany.mockResolvedValue([
        existingPost({ id: 'a', isPublished: false }),
        existingPost({ id: 'b', isPublished: true }),
      ])

      const { GET } = await import('@/app/api/admin/blog/route')
      const data = await (await GET()).json()

      expect(data).toHaveLength(2)
      // No status filter at all — the admin list is where drafts live.
      expect(mockPrisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ where: expect.anything() })
      )
    })
  })

  describe('POST /api/admin/blog', () => {
    const create = async (fields: Record<string, unknown>, image?: File) => {
      const { POST } = await import('@/app/api/admin/blog/route')
      return POST(multipart(fields, image))
    }

    it('creates a post', async () => {
      const response = await create(VALID)

      expect(response.status).toBe(201)
      expect(mockPrisma.blogPost.create).toHaveBeenCalled()
    })

    it.each([
      ['title', { ...VALID, title: '' }],
      ['slug', { ...VALID, slug: '' }],
      ['excerpt', { ...VALID, excerpt: '' }],
      ['content', { ...VALID, content: '' }],
      ['category', { ...VALID, category: '' }],
    ])('rejects a missing %s', async (_field, fields) => {
      const response = await create(fields)

      expect(response.status).toBe(400)
      expect(mockPrisma.blogPost.create).not.toHaveBeenCalled()
    })

    it('rejects a slug that is already taken', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(existingPost())

      const response = await create(VALID)

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('A post with this slug already exists')
      expect(mockPrisma.blogPost.create).not.toHaveBeenCalled()
    })

    it('derives the reading time from the body', async () => {
      await create({ ...VALID, content: Array(400).fill('saree').join(' ') })

      // 400 words at 200 wpm.
      expect(mockPrisma.blogPost.create.mock.calls[0][0].data.readMinutes).toBe(2)
    })

    it('ignores a client-supplied reading time', async () => {
      await create({ ...VALID, content: 'four short words here', readMinutes: 99 })

      expect(mockPrisma.blogPost.create.mock.calls[0][0].data.readMinutes).toBe(1)
    })

    it('leaves publishedAt unset on a draft', async () => {
      await create({ ...VALID, isPublished: false })

      expect(mockPrisma.blogPost.create.mock.calls[0][0].data.publishedAt).toBeNull()
    })

    it('stamps publishedAt when created live', async () => {
      await create({ ...VALID, isPublished: true })

      expect(mockPrisma.blogPost.create.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date)
    })

    it('accepts the string "true" that survives JSON-in-FormData', async () => {
      await create({ ...VALID, isPublished: 'true' })

      expect(mockPrisma.blogPost.create.mock.calls[0][0].data.isPublished).toBe(true)
    })

    it('demotes every other featured post when one is promoted', async () => {
      await create({ ...VALID, isFeatured: true })

      expect(mockPrisma.blogPost.updateMany).toHaveBeenCalledWith({
        where: { isFeatured: true, NOT: { id: 'post_new' } },
        data: { isFeatured: false },
      })
    })

    it('does not touch other posts when the new one is not featured', async () => {
      await create(VALID)

      expect(mockPrisma.blogPost.updateMany).not.toHaveBeenCalled()
    })

    it('rejects a cover image of the wrong type before uploading it', async () => {
      const response = await create(VALID, coverImage('a.gif', 'image/gif'))

      expect(response.status).toBe(400)
      expect(mockUploadImage).not.toHaveBeenCalled()
      expect(mockPrisma.blogPost.create).not.toHaveBeenCalled()
    })
  })

  describe('PATCH /api/admin/blog/[id]', () => {
    const patch = async (fields: Record<string, unknown>, image?: File) => {
      const { PATCH } = await import('@/app/api/admin/blog/[id]/route')
      return PATCH(multipart(fields, image), params())
    }

    it('404s for a post that does not exist', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(null)

      const response = await patch({ title: 'x' })

      expect(response.status).toBe(404)
      expect((await response.json()).error).toBe('Blog post not found')
    })

    it('allows a post to keep its own slug', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(existingPost({ slug: 'existing' }))

      const response = await patch({ slug: 'existing' })

      expect(response.status).toBe(200)
      // No uniqueness probe at all when the slug has not moved.
      expect(mockPrisma.blogPost.findFirst).not.toHaveBeenCalled()
    })

    it('rejects a slug already used by a different post', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(existingPost({ slug: 'existing' }))
      mockPrisma.blogPost.findFirst.mockResolvedValue(existingPost({ id: 'post_2' }))

      const response = await patch({ slug: 'taken' })

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('A post with this slug already exists')
      expect(mockPrisma.blogPost.update).not.toHaveBeenCalled()
    })

    it('recomputes the reading time when the body changes', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(existingPost({ readMinutes: 1 }))

      await patch({ content: Array(600).fill('saree').join(' ') })

      expect(mockPrisma.blogPost.update.mock.calls[0][0].data.readMinutes).toBe(3)
    })

    it('leaves untouched fields alone', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(existingPost())

      await patch({ title: 'Renamed' })

      const { data } = mockPrisma.blogPost.update.mock.calls[0][0]
      expect(data.title).toBe('Renamed')
      expect(data.excerpt).toBeUndefined()
      expect(data.content).toBeUndefined()
    })

    it('stamps publishedAt the first time a draft goes live', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(
        existingPost({ isPublished: false, publishedAt: null })
      )

      await patch({ isPublished: true })

      expect(mockPrisma.blogPost.update.mock.calls[0][0].data.publishedAt).toBeInstanceOf(Date)
    })

    it('does not re-stamp publishedAt on an already-published post', async () => {
      // Re-editing a live post must not shuffle it back to the top of the feed.
      mockPrisma.blogPost.findUnique.mockResolvedValue(
        existingPost({ isPublished: true, publishedAt: new Date('2024-01-01') })
      )

      await patch({ title: 'Tweaked' })

      expect(mockPrisma.blogPost.update.mock.calls[0][0].data.publishedAt).toBeUndefined()
    })

    it('keeps the original publish date across an unpublish and republish', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(
        existingPost({ isPublished: false, publishedAt: new Date('2024-01-01') })
      )

      await patch({ isPublished: true })

      expect(mockPrisma.blogPost.update.mock.calls[0][0].data.publishedAt).toBeUndefined()
    })

    it('demotes other posts when this one becomes featured', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(existingPost())

      await patch({ isFeatured: true })

      expect(mockPrisma.blogPost.updateMany).toHaveBeenCalledWith({
        where: { isFeatured: true, NOT: { id: 'post_1' } },
        data: { isFeatured: false },
      })
    })

    it('uploads the replacement cover before deleting the old one', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(
        existingPost({ image: 'https://res.cloudinary.com/old.jpg', imagePublicId: 'blog/old' })
      )

      await patch({ title: 'x' }, coverImage())

      expect(mockUploadImage).toHaveBeenCalled()
      expect(mockDeleteFromCloudinary).toHaveBeenCalledWith('blog/old')
      expect(mockUploadImage.mock.invocationCallOrder[0]).toBeLessThan(
        mockDeleteFromCloudinary.mock.invocationCallOrder[0]
      )
      expect(mockPrisma.blogPost.update.mock.calls[0][0].data.image).toBe(
        'https://res.cloudinary.com/new.jpg'
      )
    })

    it('keeps the existing cover when no new file is sent', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(
        existingPost({ image: 'https://res.cloudinary.com/old.jpg', imagePublicId: 'blog/old' })
      )

      await patch({ title: 'x' })

      expect(mockDeleteFromCloudinary).not.toHaveBeenCalled()
      expect(mockPrisma.blogPost.update.mock.calls[0][0].data.image).toBe(
        'https://res.cloudinary.com/old.jpg'
      )
    })
  })

  describe('DELETE /api/admin/blog/[id]', () => {
    const remove = async () => {
      const { DELETE } = await import('@/app/api/admin/blog/[id]/route')
      return DELETE({} as Request, params())
    }

    it('404s for a post that does not exist', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(null)

      expect((await remove()).status).toBe(404)
      expect(mockPrisma.blogPost.delete).not.toHaveBeenCalled()
    })

    it('removes the Cloudinary image before the row', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(existingPost({ imagePublicId: 'blog/x' }))

      const response = await remove()

      expect((await response.json()).message).toBe('Blog post deleted successfully')
      expect(mockDeleteFromCloudinary).toHaveBeenCalledWith('blog/x')
      expect(mockDeleteFromCloudinary.mock.invocationCallOrder[0]).toBeLessThan(
        mockPrisma.blogPost.delete.mock.invocationCallOrder[0]
      )
    })

    it('still deletes a post that never had a cover', async () => {
      mockPrisma.blogPost.findUnique.mockResolvedValue(existingPost({ imagePublicId: null }))

      expect((await remove()).status).toBe(200)
      expect(mockDeleteFromCloudinary).not.toHaveBeenCalled()
      expect(mockPrisma.blogPost.delete).toHaveBeenCalledWith({ where: { id: 'post_1' } })
    })
  })
})
