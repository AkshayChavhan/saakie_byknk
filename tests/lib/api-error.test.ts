import { describe, it, expect, vi, afterEach } from 'vitest'
import { ApiError, cartApi, hasApiErrorCode } from '@/lib/api'

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

describe('API errors carry their status and code', () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
  })

  it('surfaces ALREADY_IN_CART so the page can say "Product already in cart"', async () => {
    global.fetch = respond(409, { error: 'Product already in cart', code: 'ALREADY_IN_CART' }) as typeof fetch

    const error = await cartApi.addItem({ productId: 'p1', quantity: 1 }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toBe('Product already in cart')
    expect(error.status).toBe(409)
    expect(hasApiErrorCode(error, 'ALREADY_IN_CART')).toBe(true)
  })

  it('keeps plain errors working for callers that only read the message', async () => {
    global.fetch = respond(400, { error: 'Only 2 items available in stock' }) as typeof fetch

    const error = await cartApi.addItem({ productId: 'p1', quantity: 5 }).catch((e) => e)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Only 2 items available in stock')
    expect(hasApiErrorCode(error, 'ALREADY_IN_CART')).toBe(false)
    expect(hasApiErrorCode(new Error('x'), 'ALREADY_IN_CART')).toBe(false)
  })
})
