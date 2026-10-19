import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  watermarkImageUrl,
  cloudinaryVersion,
  watermarkSinceSeconds,
  DEFAULT_WATERMARK_PUBLIC_ID,
  DEFAULT_WATERMARK_SINCE,
} from '@/lib/image-watermark'

// Cutover 2026-10-19T00:00:00Z = 1792368000. One photo from before, one after.
const SINCE = Math.floor(Date.parse(DEFAULT_WATERMARK_SINCE) / 1000)
const OLD = `https://res.cloudinary.com/doilfcjxb/image/upload/v${SINCE - 86400}/saakie-byknk/products/old.jpg`
const NEW = `https://res.cloudinary.com/doilfcjxb/image/upload/v${SINCE + 60}/saakie-byknk/products/new.jpg`
const UNSPLASH = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1920&h=1080&fit=crop'

describe('watermarkImageUrl when switched off', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('passes URLs through untouched only when WATERMARK_ENABLED is "false"', () => {
    vi.stubEnv('WATERMARK_ENABLED', 'false')
    expect(watermarkImageUrl(NEW)).toBe(NEW)
  })

  it('is on by default and for any other value', () => {
    for (const value of [undefined, '', 'true', '1', 'yes']) {
      vi.stubEnv('WATERMARK_ENABLED', value)
      expect(watermarkImageUrl(NEW)).not.toBe(NEW)
    }
  })
})

describe('watermarkImageUrl', () => {
  beforeEach(() => {
    vi.stubEnv('WATERMARK_ENABLED', 'true')
    vi.stubEnv('WATERMARK_PUBLIC_ID', '')
    vi.stubEnv('WATERMARK_SINCE', '')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('marks a photo uploaded after the cutover by splicing the logo overlay in after /image/upload/', () => {
    expect(watermarkImageUrl(NEW)).toBe(
      `https://res.cloudinary.com/doilfcjxb/image/upload/l_saakie-byknk:watermark,o_55,g_center,fl_relative,w_0.7/v${SINCE + 60}/saakie-byknk/products/new.jpg`
    )
    expect(DEFAULT_WATERMARK_PUBLIC_ID).toBe('saakie-byknk/watermark')
  })

  it('leaves a photo uploaded before the cutover exactly as it is', () => {
    expect(watermarkImageUrl(OLD)).toBe(OLD)
  })

  it('marks a photo uploaded at the cutover second itself', () => {
    const atCutover = NEW.replace(`v${SINCE + 60}`, `v${SINCE}`)
    expect(watermarkImageUrl(atCutover)).toContain('l_saakie-byknk:watermark')
  })

  it('honours WATERMARK_SINCE as an ISO date or Unix seconds', () => {
    vi.stubEnv('WATERMARK_SINCE', '2030-01-01T00:00:00Z')
    expect(watermarkImageUrl(NEW)).toBe(NEW)

    vi.stubEnv('WATERMARK_SINCE', String(SINCE - 10 * 86400))
    expect(watermarkImageUrl(OLD)).toContain('l_saakie-byknk:watermark')

    vi.stubEnv('WATERMARK_SINCE', 'not a date')
    expect(watermarkSinceSeconds()).toBe(SINCE)
  })

  it('never marks remote demo photos, local files or data URLs', () => {
    for (const url of [UNSPLASH, 'https://images.pexels.com/photos/1.jpeg', '/images/placeholder-product.svg', 'data:image/png;base64,AAAA']) {
      expect(watermarkImageUrl(url)).toBe(url)
    }
  })

  it('treats a Cloudinary URL without a version as of unknown age and leaves it alone', () => {
    const unversioned = 'https://res.cloudinary.com/doilfcjxb/image/upload/saakie-byknk/products/x.jpg'
    expect(cloudinaryVersion(unversioned)).toBeNull()
    expect(watermarkImageUrl(unversioned)).toBe(unversioned)
  })

  it('writes folder separators in the layer id as ":" and honours WATERMARK_PUBLIC_ID', () => {
    vi.stubEnv('WATERMARK_PUBLIC_ID', 'brand/marks/logo')
    expect(watermarkImageUrl(NEW)).toContain('/l_brand:marks:logo,')
  })

  it('scales with the delivered image rather than using a fixed size', () => {
    const result = watermarkImageUrl(NEW)
    expect(result).toContain('fl_relative')
    expect(result).toContain('w_0.7')
  })

  it('does not stack overlays when applied twice', () => {
    const once = watermarkImageUrl(NEW)
    expect(watermarkImageUrl(once)).toBe(once)
  })

  it('handles empty input without throwing', () => {
    expect(watermarkImageUrl('')).toBe('')
  })

  it('honours custom scale and opacity', () => {
    const result = watermarkImageUrl(NEW, { scale: 0.5, opacity: 60 })
    expect(result).toContain('w_0.5')
    expect(result).toContain('o_60')
  })
})
