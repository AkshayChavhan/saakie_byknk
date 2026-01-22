import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock cloudinary
const mockUploadStream = vi.fn()
const mockDestroy = vi.fn()
const mockUrl = vi.fn()

vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: mockUploadStream,
      destroy: mockDestroy,
    },
    url: mockUrl,
  },
}))

describe('cloudinary utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUploadStream.mockReset()
    mockDestroy.mockReset()
    mockUrl.mockReset()
  })

  // Note: uploadToCloudinary tests are skipped because File.arrayBuffer()
  // is not available in jsdom environment. These should be tested in
  // integration tests with a real environment.

  describe('deleteFromCloudinary', () => {
    it('deletes image successfully', async () => {
      mockDestroy.mockResolvedValue({ result: 'ok' })

      const { deleteFromCloudinary } = await import('@/lib/cloudinary')
      const result = await deleteFromCloudinary('public_123')

      expect(mockDestroy).toHaveBeenCalledWith('public_123')
      expect(result).toEqual({ result: 'ok' })
    })

    it('handles delete error', async () => {
      mockDestroy.mockRejectedValue(new Error('Delete failed'))

      const { deleteFromCloudinary } = await import('@/lib/cloudinary')

      await expect(deleteFromCloudinary('public_123')).rejects.toThrow('Delete failed')
    })
  })

  describe('generateOptimizedUrl', () => {
    it('generates URL with default options', async () => {
      mockUrl.mockReturnValue('https://cloudinary.com/optimized/image.jpg')

      const { generateOptimizedUrl } = await import('@/lib/cloudinary')
      const result = generateOptimizedUrl('public_123')

      expect(result).toBe('https://cloudinary.com/optimized/image.jpg')
      expect(mockUrl).toHaveBeenCalledWith('public_123', {
        transformation: [
          {
            width: undefined,
            height: undefined,
            crop: 'fill',
            quality: 'auto',
            fetch_format: 'auto',
          },
        ],
        secure: true,
      })
    })

    it('generates URL with custom dimensions', async () => {
      mockUrl.mockReturnValue('https://cloudinary.com/image.jpg')

      const { generateOptimizedUrl } = await import('@/lib/cloudinary')
      generateOptimizedUrl('public_123', { width: 400, height: 300 })

      expect(mockUrl).toHaveBeenCalledWith('public_123', {
        transformation: [
          {
            width: 400,
            height: 300,
            crop: 'fill',
            quality: 'auto',
            fetch_format: 'auto',
          },
        ],
        secure: true,
      })
    })

    it('generates URL with custom crop mode', async () => {
      mockUrl.mockReturnValue('https://cloudinary.com/image.jpg')

      const { generateOptimizedUrl } = await import('@/lib/cloudinary')
      generateOptimizedUrl('public_123', { crop: 'scale' })

      expect(mockUrl).toHaveBeenCalledWith('public_123', {
        transformation: [
          expect.objectContaining({
            crop: 'scale',
          }),
        ],
        secure: true,
      })
    })

    it('generates URL with custom quality', async () => {
      mockUrl.mockReturnValue('https://cloudinary.com/image.jpg')

      const { generateOptimizedUrl } = await import('@/lib/cloudinary')
      generateOptimizedUrl('public_123', { quality: 80 })

      expect(mockUrl).toHaveBeenCalledWith('public_123', {
        transformation: [
          expect.objectContaining({
            quality: 80,
          }),
        ],
        secure: true,
      })
    })
  })
})
