import { describe, it, expect } from 'vitest'
import { NextResponse } from 'next/server'
import {
  parseLimit,
  parsePage,
  validateBody,
  cartAddSchema,
  productUpdateSchema,
  userRoleSchema,
} from '@/lib/server/validation'

describe('parseLimit / parsePage', () => {
  it('falls back on missing or non-numeric input instead of producing NaN', () => {
    expect(parseLimit(null, 20)).toBe(20)
    expect(parseLimit('abc', 20)).toBe(20)
    expect(parseLimit('', 12)).toBe(12)
    expect(parsePage('x')).toBe(1)
  })

  it('clamps to the allowed range', () => {
    expect(parseLimit('100000', 20)).toBe(100)
    expect(parseLimit('0', 20)).toBe(1)
    expect(parseLimit('-5', 20)).toBe(1)
    expect(parseLimit('50', 20, 25)).toBe(25)
    expect(parsePage('0')).toBe(1)
  })
})

describe('validateBody', () => {
  it('returns the parsed value on success', () => {
    const r = validateBody(cartAddSchema, { productId: '507f1f77bcf86cd799439011' })
    expect(r).toEqual({ productId: '507f1f77bcf86cd799439011', quantity: 1 })
  })

  it('returns a 400 naming the field on failure', async () => {
    const r = validateBody(cartAddSchema, { productId: 'nope', quantity: 2 })
    expect(r).toBeInstanceOf(NextResponse)
    const body = await (r as NextResponse).json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.message).toMatch(/^productId: /)
  })

  it('rejects a null body', () => {
    expect(validateBody(userRoleSchema, null)).toBeInstanceOf(NextResponse)
  })
})

describe('productUpdateSchema', () => {
  it('drops relation writes so a body cannot reach other collections', () => {
    const r = validateBody(productUpdateSchema, {
      isActive: false,
      orderItems: { deleteMany: {} },
      images: { create: [{ url: 'x' }] },
    })
    expect(r).toEqual({ isActive: false })
  })

  it('rejects wrong types', () => {
    expect(validateBody(productUpdateSchema, { price: '100' })).toBeInstanceOf(NextResponse)
    expect(validateBody(productUpdateSchema, { stock: 1.5 })).toBeInstanceOf(NextResponse)
    expect(validateBody(productUpdateSchema, { slug: 'Has Spaces' })).toBeInstanceOf(NextResponse)
  })
})
