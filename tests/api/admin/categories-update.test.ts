// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSession, createMockUser } from '../../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

const mockPrisma = {
  user: { findUnique: vi.fn() },
  category: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

const mockUpload = vi.fn()
const mockDelete = vi.fn()
vi.mock('@/lib/cloudinary', () => ({
  uploadImage: (...args: unknown[]) => mockUpload(...args),
  deleteImage: (...args: unknown[]) => mockDelete(...args),
}))

const ctx = { params: Promise.resolve({ id: 'cat_1' }) }
const URL_ = 'http://localhost:3000/api/admin/categories/cat_1'

const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], 'chiffon.jpg', { type: 'image/jpeg' })

function multipart(data: Record<string, unknown>, image?: File) {
  const body = new FormData()
  body.set('data', JSON.stringify(data))
  if (image) body.set('image', image)
  return new NextRequest(URL_, { method: 'PATCH', body })
}

async function patch(request: NextRequest) {
  const { PATCH } = await import('@/app/api/admin/categories/[id]/route')
  return PATCH(request, ctx)
}

describe('PATCH /api/admin/categories/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(createMockSession({ id: 'admin_1' }))
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'admin_1', role: 'ADMIN' }))
    mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat_1', imagePublicId: 'saakie-byknk/categories/old' })
    mockPrisma.category.findFirst.mockResolvedValue(null)
    mockPrisma.category.update.mockImplementation(({ data }) => Promise.resolve({ id: 'cat_1', ...data }))
    mockDelete.mockResolvedValue(undefined)
  })

  it('uploads a newly picked image from the edit form and replaces the old one', async () => {
    mockUpload.mockResolvedValue({
      url: 'https://res.cloudinary.com/demo/image/upload/v1/saakie-byknk/categories/new.jpg',
      publicId: 'saakie-byknk/categories/new',
      width: 800,
      height: 800,
      format: 'jpg',
    })

    const response = await patch(multipart({ name: 'Chiffon', slug: 'chiffon' }, jpeg()))

    expect(response.status).toBe(200)
    expect(mockUpload).toHaveBeenCalledWith(expect.any(Buffer), 'categories')
    expect(mockPrisma.category.update.mock.calls[0][0].data).toMatchObject({
      name: 'Chiffon',
      image: 'https://res.cloudinary.com/demo/image/upload/v1/saakie-byknk/categories/new.jpg',
      imagePublicId: 'saakie-byknk/categories/new',
      imageWidth: 800,
      imageHeight: 800,
      imageFormat: 'jpg',
    })
    expect(mockDelete).toHaveBeenCalledWith('saakie-byknk/categories/old')
  })

  it('keeps the current image when the form sends none', async () => {
    const response = await patch(multipart({ name: 'Chiffon', removeImage: false }))

    expect(response.status).toBe(200)
    expect(mockUpload).not.toHaveBeenCalled()
    expect(mockPrisma.category.update.mock.calls[0][0].data).not.toHaveProperty('image')
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('clears the image when the admin removes it', async () => {
    const response = await patch(multipart({ name: 'Chiffon', removeImage: true }))

    expect(response.status).toBe(200)
    expect(mockPrisma.category.update.mock.calls[0][0].data).toMatchObject({
      image: null,
      imagePublicId: null,
      imageWidth: null,
      imageHeight: null,
      imageFormat: null,
    })
    expect(mockDelete).toHaveBeenCalledWith('saakie-byknk/categories/old')
  })

  it('leaves the category untouched when Cloudinary rejects the upload', async () => {
    mockUpload.mockRejectedValue(new Error('cloudinary down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await patch(multipart({ name: 'Chiffon' }, jpeg()))

    expect(response.status).toBe(500)
    expect((await response.json()).error).toBe('Failed to upload image')
    expect(mockPrisma.category.update).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('deletes the fresh upload if saving the category fails', async () => {
    mockUpload.mockResolvedValue({ url: 'https://res.cloudinary.com/x/new.jpg', publicId: 'new_id' })
    mockPrisma.category.update.mockRejectedValue(new Error('db down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await patch(multipart({ name: 'Chiffon' }, jpeg()))

    expect(response.status).toBe(500)
    expect(mockDelete).toHaveBeenCalledWith('new_id')
    expect(mockDelete).not.toHaveBeenCalledWith('saakie-byknk/categories/old')
  })

  it('rejects a file that is not an image', async () => {
    const pdf = new File([new Uint8Array([1, 2, 3])], 'menu.pdf', { type: 'application/pdf' })

    const response = await patch(multipart({ name: 'Chiffon' }, pdf))

    expect(response.status).toBe(400)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('still accepts the plain JSON the list toggles send', async () => {
    const response = await patch(
      new NextRequest(URL_, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
    )

    expect(response.status).toBe(200)
    expect(mockPrisma.category.update.mock.calls[0][0].data).toEqual({ isActive: false })
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('returns 404 for a category that does not exist', async () => {
    mockPrisma.category.findUnique.mockResolvedValue(null)

    const response = await patch(multipart({ name: 'Chiffon' }, jpeg()))

    expect(response.status).toBe(404)
    expect(mockUpload).not.toHaveBeenCalled()
  })
})
