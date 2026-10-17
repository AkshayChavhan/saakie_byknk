import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { watermarkImageUrl, DEFAULT_WATERMARK_PUBLIC_ID } from '@/lib/image-watermark'

const CLOUDINARY =
  'https://res.cloudinary.com/doilfcjxb/image/upload/v1785130199/saakie-byknk/products/abc123.jpg'
const UNSPLASH = 'https://images.unsplash.com/photo-1610030469983?w=1920&h=1080&fit=crop'

describe('watermarkImageUrl when switched off', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('passes URLs through untouched only when WATERMARK_ENABLED is "false"', () => {
    vi.stubEnv('WATERMARK_ENABLED', 'false')
    expect(watermarkImageUrl(CLOUDINARY)).toBe(CLOUDINARY)
    expect(watermarkImageUrl(UNSPLASH)).toBe(UNSPLASH)
  })

  it('is on by default and for any other value', () => {
    for (const value of [undefined, '', 'true', '1', 'yes']) {
      vi.stubEnv('WATERMARK_ENABLED', value)
      expect(watermarkImageUrl(CLOUDINARY)).not.toBe(CLOUDINARY)
    }
  })
})

describe('watermarkImageUrl', () => {
  beforeEach(() => {
    vi.stubEnv('WATERMARK_ENABLED', 'true')
    vi.stubEnv('WATERMARK_FETCH_REMOTE', 'true')
    vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'doilfcjxb')
    vi.stubEnv('WATERMARK_PUBLIC_ID', '')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('splices the logo overlay in after /image/upload/', () => {
    const result = watermarkImageUrl(CLOUDINARY)

    expect(result).toBe(
      'https://res.cloudinary.com/doilfcjxb/image/upload/l_saakie-byknk:watermark,o_55,g_center,fl_relative,w_0.7/v1785130199/saakie-byknk/products/abc123.jpg'
    )
    expect(DEFAULT_WATERMARK_PUBLIC_ID).toBe('saakie-byknk/watermark')
  })

  it('writes folder separators in the layer id as ":" and honours WATERMARK_PUBLIC_ID', () => {
    vi.stubEnv('WATERMARK_PUBLIC_ID', 'brand/marks/logo')
    expect(watermarkImageUrl(CLOUDINARY)).toContain('/l_brand:marks:logo,')
  })

  it('scales with the delivered image rather than using a fixed size', () => {
    // Without fl_relative the mark is invisible on a thumbnail and enormous
    // on a zoom view, which is the usual reason watermarking looks broken.
    const result = watermarkImageUrl(CLOUDINARY)
    expect(result).toContain('fl_relative')
    expect(result).toContain('w_0.7')
  })

  it('routes remote demo photos through Cloudinary fetch so they are marked too', () => {
    const result = watermarkImageUrl(UNSPLASH)
    expect(result).toBe(
      `https://res.cloudinary.com/doilfcjxb/image/fetch/l_saakie-byknk:watermark,o_55,g_center,fl_relative,w_0.7/${encodeURIComponent(UNSPLASH)}`
    )
  })

  it('leaves a remote photo alone until WATERMARK_FETCH_REMOTE is "true"', () => {
    // Cloudinary accounts refuse fetched images (401) until the setting is
    // turned on; rewriting before then would break every demo photo.
    vi.stubEnv('WATERMARK_FETCH_REMOTE', '')
    expect(watermarkImageUrl(UNSPLASH)).toBe(UNSPLASH)
    expect(watermarkImageUrl(CLOUDINARY)).toContain('l_saakie-byknk:watermark')
  })

  it('leaves a remote photo alone when no cloud name is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', '')
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', '')
    expect(watermarkImageUrl(UNSPLASH)).toBe(UNSPLASH)
    // Uploaded photos need no cloud name: it is already in the URL.
    expect(watermarkImageUrl(CLOUDINARY)).toContain('l_saakie-byknk:watermark')
  })

  it('leaves local files and data URLs alone', () => {
    for (const url of ['/images/placeholder-product.svg', '/images/product-1.jpg', 'data:image/png;base64,AAAA']) {
      expect(watermarkImageUrl(url)).toBe(url)
    }
  })

  it('does not stack overlays when applied twice', () => {
    const once = watermarkImageUrl(CLOUDINARY)
    expect(watermarkImageUrl(once)).toBe(once)
    const fetched = watermarkImageUrl(UNSPLASH)
    expect(watermarkImageUrl(fetched)).toBe(fetched)
  })

  it('handles empty input without throwing', () => {
    expect(watermarkImageUrl('')).toBe('')
  })

  it('honours custom scale and opacity', () => {
    const result = watermarkImageUrl(CLOUDINARY, { scale: 0.5, opacity: 60 })
    expect(result).toContain('w_0.5')
    expect(result).toContain('o_60')
  })
})
