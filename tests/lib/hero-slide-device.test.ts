import { describe, it, expect } from 'vitest'
import {
  parseHeroSlideDevice,
  otherHeroSlideDevice,
  DESKTOP_MEDIA_QUERY,
  DESKTOP_MIN_WIDTH_PX,
} from '@/lib/hero-slide-device'

describe('hero slide device helpers', () => {
  it('parses the two sets case-insensitively and rejects anything else', () => {
    expect(parseHeroSlideDevice('DESKTOP')).toBe('DESKTOP')
    expect(parseHeroSlideDevice(' mobile ')).toBe('MOBILE')
    expect(parseHeroSlideDevice('tablet')).toBeNull()
    expect(parseHeroSlideDevice(1)).toBeNull()
    expect(parseHeroSlideDevice(undefined)).toBeNull()
  })

  it('names the opposite set', () => {
    expect(otherHeroSlideDevice('DESKTOP')).toBe('MOBILE')
    expect(otherHeroSlideDevice('MOBILE')).toBe('DESKTOP')
  })

  it('draws the line at the lg breakpoint', () => {
    expect(DESKTOP_MIN_WIDTH_PX).toBe(1024)
    expect(DESKTOP_MEDIA_QUERY).toBe('(min-width: 1024px)')
  })
})
