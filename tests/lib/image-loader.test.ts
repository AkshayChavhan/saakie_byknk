import { describe, it, expect } from 'vitest'
import imageLoader from '@/lib/image-loader'

const CLD = 'https://res.cloudinary.com/demo/image/upload'

describe('imageLoader: Cloudinary photos are resized by Cloudinary', () => {
  it('asks for the width first and the best format and quality last', () => {
    expect(imageLoader({ src: `${CLD}/v1760900000/saakie-byknk/products/saree.jpg`, width: 640 })).toBe(
      `${CLD}/c_limit,w_640/f_auto,q_auto/v1760900000/saakie-byknk/products/saree.jpg`
    )
  })

  it('keeps the watermark, sized after the resize so it scales with the photo', () => {
    const marked = `${CLD}/l_saakie-byknk:watermark,o_55,g_center,fl_relative,w_0.7/v1760900000/saakie-byknk/products/saree.jpg`

    expect(imageLoader({ src: marked, width: 828 })).toBe(
      `${CLD}/c_limit,w_828/l_saakie-byknk:watermark,o_55,g_center,fl_relative,w_0.7/f_auto,q_auto/v1760900000/saakie-byknk/products/saree.jpg`
    )
  })

  it('uses a requested quality instead of automatic', () => {
    expect(imageLoader({ src: `${CLD}/v1/hero.jpg`, width: 1920, quality: 90 })).toBe(
      `${CLD}/c_limit,w_1920/f_auto,q_90/v1/hero.jpg`
    )
  })

  it('handles a URL without a version', () => {
    expect(imageLoader({ src: `${CLD}/saakie-byknk/categories/silk.png`, width: 256 })).toBe(
      `${CLD}/c_limit,w_256/f_auto,q_auto/saakie-byknk/categories/silk.png`
    )
  })

  it('handles a fetched remote photo without touching the remote address', () => {
    const fetched = 'https://res.cloudinary.com/demo/image/fetch/l_logo,o_55/https://images.pexels.com/photos/1/a.jpeg'

    expect(imageLoader({ src: fetched, width: 640 })).toBe(
      'https://res.cloudinary.com/demo/image/fetch/c_limit,w_640/l_logo,o_55/f_auto,q_auto/https://images.pexels.com/photos/1/a.jpeg'
    )
  })

  it('gives each width its own URL from the same original', () => {
    const src = `${CLD}/v1/a.jpg`
    expect(imageLoader({ src, width: 640 })).not.toBe(imageLoader({ src, width: 1080 }))
  })
})

describe('imageLoader: other hosts use their own resize parameter', () => {
  it('scales an Unsplash photo, keeping its aspect ratio', () => {
    const url = new URL(
      imageLoader({ src: 'https://images.unsplash.com/photo-1?w=1920&h=1080&fit=crop', width: 640 })
    )
    expect(url.searchParams.get('w')).toBe('640')
    expect(url.searchParams.get('h')).toBe('360')
    expect(url.searchParams.get('fit')).toBe('crop')
    expect(url.searchParams.get('auto')).toBe('format')
  })

  it('scales a Pexels demo photo', () => {
    const url = new URL(
      imageLoader({ src: 'https://images.pexels.com/photos/1/a.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750', width: 630 })
    )
    expect(url.searchParams.get('w')).toBe('630')
    expect(url.searchParams.get('h')).toBe('375')
  })

  it('asks Clerk for a sized profile photo', () => {
    expect(new URL(imageLoader({ src: 'https://img.clerk.com/abc', width: 64 })).searchParams.get('width')).toBe('64')
  })

  it('serves local files as they are, with the width in the query', () => {
    expect(imageLoader({ src: '/images/saakieLogo.jpeg', width: 96 })).toBe('/images/saakieLogo.jpeg?w=96')
  })

  it('never returns the bare source, which next/image would flag', () => {
    for (const src of ['/images/owners.jpg', 'https://saakie.vercel.app/x.png', `${CLD}/v1/a.jpg`]) {
      expect(imageLoader({ src, width: 320 })).not.toBe(src)
    }
  })
})
