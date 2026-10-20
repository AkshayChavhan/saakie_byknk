import { describe, it, expect } from 'vitest'
import { isPrebookable, PREBOOK_MESSAGE, PREBOOK_LINE_NOTE } from '@/lib/prebook'

describe('pre-booking rule', () => {
  it('makes an active, sold-out saree pre-bookable', () => {
    expect(isPrebookable({ stock: 0, isActive: true })).toBe(true)
    expect(isPrebookable({ stock: 0 })).toBe(true)
  })

  it('leaves in-stock and deactivated sarees alone', () => {
    expect(isPrebookable({ stock: 1, isActive: true })).toBe(false)
    expect(isPrebookable({ stock: 0, isActive: false })).toBe(false)
  })

  it('promises 15–20 days everywhere', () => {
    expect(PREBOOK_MESSAGE.title).toBe('Your favourite saree is worth the wait!')
    expect(PREBOOK_MESSAGE.paragraphs[0]).toContain('15–20 days')
    expect(PREBOOK_LINE_NOTE).toContain('15–20 days')
  })
})
