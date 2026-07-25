import { describe, it, expect } from 'vitest'
import {
  fitWithin,
  totalSize,
  formatBytes,
  compressImage,
  DEFAULT_MAX_DIMENSION,
  MAX_TOTAL_UPLOAD_BYTES,
} from '@/lib/image-compress'

const mockFile = (type: string, size: number, name = 'photo.jpg'): File => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size, writable: false })
  return file
}

describe('image compression helpers', () => {
  describe('fitWithin', () => {
    it('leaves images that already fit untouched', () => {
      expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
    })

    it('never upscales', () => {
      expect(fitWithin(100, 100, 1600)).toEqual({ width: 100, height: 100 })
    })

    it('caps the long edge of a landscape image and keeps the ratio', () => {
      expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    })

    it('caps the long edge of a portrait image and keeps the ratio', () => {
      expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
    })

    it('keeps a scaled edge at a minimum of 1px', () => {
      const { height } = fitWithin(10000, 3, DEFAULT_MAX_DIMENSION)
      expect(height).toBeGreaterThanOrEqual(1)
    })
  })

  describe('totalSize', () => {
    it('sums file sizes', () => {
      const files = [mockFile('image/jpeg', 1000), mockFile('image/png', 2500)]
      expect(totalSize(files)).toBe(3500)
    })

    it('is zero for an empty selection', () => {
      expect(totalSize([])).toBe(0)
    })
  })

  describe('formatBytes', () => {
    it('formats bytes, kilobytes and megabytes', () => {
      expect(formatBytes(512)).toBe('512 B')
      expect(formatBytes(2048)).toBe('2 KB')
      expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB')
    })

    it('describes the upload ceiling in megabytes', () => {
      expect(formatBytes(MAX_TOTAL_UPLOAD_BYTES)).toBe('4.0 MB')
    })
  })

  describe('compressImage', () => {
    it('passes non-image files straight through', async () => {
      const pdf = mockFile('application/pdf', 1024, 'invoice.pdf')
      await expect(compressImage(pdf)).resolves.toBe(pdf)
    })

    // jsdom has no canvas encoder or createImageBitmap, which stands in for a
    // browser that cannot decode the format (HEIC, say). The original file
    // must survive so server-side validation reports the real problem.
    it('returns the original when the browser cannot re-encode it', async () => {
      const photo = mockFile('image/jpeg', 4 * 1024 * 1024)
      await expect(compressImage(photo)).resolves.toBe(photo)
    })
  })
})
