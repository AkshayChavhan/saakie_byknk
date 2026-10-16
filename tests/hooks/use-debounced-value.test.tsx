import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

describe('useDebouncedValue', () => {
  afterEach(() => vi.useRealTimers())

  it('starts with the initial value and only settles after the delay', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    })
    expect(result.current).toBe('a')

    rerender({ v: 'ab' })
    rerender({ v: 'abc' })
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('a')

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('abc')
  })

  it('restarts the timer on every change, so fast typing yields one update', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: '' },
    })
    for (const v of ['s', 'si', 'sil', 'silk']) {
      rerender({ v })
      act(() => vi.advanceTimersByTime(200))
    }
    expect(result.current).toBe('')
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('silk')
  })
})
