import { describe, it, expect } from 'vitest'
import { watermarkImageUrl, WATERMARK_TEXT } from '@/lib/image-watermark'

const CLOUDINARY =
  'https://res.cloudinary.com/doilfcjxb/image/upload/v1785130199/saakie-byknk/products/abc123.jpg'

describe('watermarkImageUrl', () => {
  it('splices the overlay in after /image/upload/', () => {
    const result = watermarkImageUrl(CLOUDINARY)

    expect(result).toContain('/image/upload/l_text:')
    // The public ID and version must survive untouched, or the URL 404s.
    expect(result).toContain('/v1785130199/saakie-byknk/products/abc123.jpg')
  })

  it('encodes the ownership text, spaces included', () => {
    expect(watermarkImageUrl(CLOUDINARY)).toContain(
      encodeURIComponent(WATERMARK_TEXT)
    )
    expect(WATERMARK_TEXT).toBe('owned by saakiebyknk')
  })

  it('scales with the delivered image rather than using a fixed size', () => {
    // Without fl_relative the mark is illegible on a thumbnail and enormous on
    // a zoom view, which is the usual reason watermarking looks broken.
    const result = watermarkImageUrl(CLOUDINARY)
    expect(result).toContain('fl_relative')
    expect(result).toContain('w_0.72')
  })

  it('leaves non-Cloudinary sources alone', () => {
    // Local placeholders and the Unsplash/Pexels demo photos are not ours.
    for (const url of [
      '/images/placeholder-product.svg',
      'https://images.unsplash.com/photo-1610030469983.jpg',
      'https://images.pexels.com/photos/1.jpeg',
    ]) {
      expect(watermarkImageUrl(url)).toBe(url)
    }
  })

  it('does not stack overlays when applied twice', () => {
    const once = watermarkImageUrl(CLOUDINARY)
    expect(watermarkImageUrl(once)).toBe(once)
  })

  it('handles empty input without throwing', () => {
    expect(watermarkImageUrl('')).toBe('')
  })

  it('double-encodes commas so they are not read as separators', () => {
    const result = watermarkImageUrl(CLOUDINARY, { text: 'a,b' })
    expect(result).toContain('%252C')
  })

  it('honours custom scale and opacity', () => {
    const result = watermarkImageUrl(CLOUDINARY, { scale: 0.5, opacity: 60 })
    expect(result).toContain('w_0.5')
    expect(result).toContain('o_60')
  })
})
