import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * `cached()` is a pass-through under Vitest so the route tests can see
 * every query. These tests turn the bypass off to check the wiring to
 * Next's data cache: the key, the tags and the time-based fallback.
 */
const mockUnstableCache = vi.fn()
const mockRevalidateTag = vi.fn()
vi.mock('next/cache', () => ({
  unstable_cache: (...args: unknown[]) => mockUnstableCache(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}))

async function loadWithBypass(bypass: boolean) {
  vi.resetModules()
  vi.stubEnv('VITEST', bypass ? 'true' : '')
  return import('@/lib/server/cache')
}

describe('cached()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUnstableCache.mockImplementation((fn: unknown) => fn)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('registers the function under its key, tags and a fallback revalidate', async () => {
    const { cached, TAG, DEFAULT_REVALIDATE_SECONDS } = await loadWithBypass(false)
    const fn = vi.fn().mockResolvedValue('x')

    const wrapped = cached(fn, 'thing', { tags: [TAG.categories] })

    expect(mockUnstableCache).toHaveBeenCalledWith(fn, ['thing'], {
      tags: ['categories'],
      revalidate: DEFAULT_REVALIDATE_SECONDS,
    })
    expect(await wrapped()).toBe('x')
  })

  it('honours an explicit revalidate window', async () => {
    const { cached, TAG } = await loadWithBypass(false)
    cached(async () => 1, 'k', { tags: [TAG.settings], revalidate: 60 })
    expect(mockUnstableCache).toHaveBeenCalledWith(expect.any(Function), ['k'], {
      tags: ['settings'],
      revalidate: 60,
    })
  })

  it('is a pass-through under Vitest', async () => {
    const { cached, TAG } = await loadWithBypass(true)
    const fn = async () => 1
    expect(cached(fn, 'k', { tags: [TAG.products] })).toBe(fn)
    expect(mockUnstableCache).not.toHaveBeenCalled()
  })
})

describe('invalidate()', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllEnvs())

  it('revalidates every tag given', async () => {
    const { invalidate, TAG } = await loadWithBypass(false)
    invalidate(TAG.products, TAG.categories)
    expect(mockRevalidateTag).toHaveBeenCalledWith('products')
    expect(mockRevalidateTag).toHaveBeenCalledWith('categories')
  })

  it('never throws, even if Next refuses the call', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockRevalidateTag.mockImplementation(() => {
      throw new Error('no request context')
    })
    const { invalidate, TAG } = await loadWithBypass(false)
    expect(() => invalidate(TAG.products)).not.toThrow()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
