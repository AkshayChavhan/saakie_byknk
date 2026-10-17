import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { markImages, markLines, markProduct } from '@/lib/server/watermark'

const PHOTO = 'https://res.cloudinary.com/c/image/upload/v1/saakie-byknk/products/a.jpg'
const MARK = 'l_saakie-byknk:watermark'

describe('server watermark mappers', () => {
  beforeEach(() => vi.stubEnv('WATERMARK_ENABLED', 'true'))
  afterEach(() => vi.unstubAllEnvs())

  it('marks every image in a list without touching other fields', () => {
    const out = markImages([{ id: 'i', url: PHOTO, isPrimary: true }])
    expect(out[0].url).toContain(MARK)
    expect(out[0]).toMatchObject({ id: 'i', isPrimary: true })
  })

  it('marks a product\'s images[] and flat image, leaving a product without either as is', () => {
    const p = markProduct({ id: 'p', images: [{ url: PHOTO }], image: PHOTO, price: 1 })
    expect(p.images![0].url).toContain(MARK)
    expect(p.image).toContain(MARK)
    expect(p.price).toBe(1)

    const bare = { id: 'q', name: 'x' }
    expect(markProduct(bare)).toEqual(bare)
  })

  it('marks the product photos inside cart, wishlist and order lines', () => {
    const cart = {
      id: 'c',
      subtotal: 5,
      items: [
        { id: 'l1', quantity: 1, product: { id: 'p', images: [{ url: PHOTO }] } },
        { id: 'l2', quantity: 2, product: null },
      ],
    }
    const out = markLines(cart)
    expect(out.items[0].product!.images![0].url).toContain(MARK)
    expect(out.items[1].product).toBeNull()
    expect(out.subtotal).toBe(5)
    // The input is not mutated.
    expect(cart.items[0].product!.images![0].url).toBe(PHOTO)
  })

  it('passes a holder without items through', () => {
    const order = { id: 'o', total: 1 }
    expect(markLines(order)).toEqual(order)
  })
})
