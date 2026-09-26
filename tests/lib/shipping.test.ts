import { describe, it, expect } from 'vitest'
import {
  calculateShipping,
  amountToFreeShipping,
  SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  DEFAULT_SHIPPING_SETTINGS,
} from '@/lib/shipping'

const ON = { shippingEnabled: true }
const OFF = { shippingEnabled: false }

describe('lib/shipping', () => {
  describe('calculateShipping — toggle on', () => {
    it('charges the flat fee below the free-shipping threshold', () => {
      expect(calculateShipping(400, 2, ON)).toBe(SHIPPING_FEE)
    })

    it('charges the flat fee exactly at the threshold', () => {
      expect(calculateShipping(FREE_SHIPPING_THRESHOLD, 1, ON)).toBe(SHIPPING_FEE)
    })

    it('ships free just above the threshold', () => {
      expect(calculateShipping(FREE_SHIPPING_THRESHOLD + 1, 1, ON)).toBe(0)
    })

    it('ships free well above the threshold', () => {
      expect(calculateShipping(5999, 1, ON)).toBe(0)
    })

    it('charges nothing for an empty cart', () => {
      expect(calculateShipping(0, 0, ON)).toBe(0)
    })
  })

  describe('calculateShipping — toggle off', () => {
    it('is free below the threshold', () => {
      expect(calculateShipping(400, 2, OFF)).toBe(0)
    })

    it('is free at the threshold', () => {
      expect(calculateShipping(FREE_SHIPPING_THRESHOLD, 1, OFF)).toBe(0)
    })

    it('is free above the threshold', () => {
      expect(calculateShipping(5999, 3, OFF)).toBe(0)
    })

    it('is free for an empty cart', () => {
      expect(calculateShipping(0, 0, OFF)).toBe(0)
    })

    it('is free for any subtotal at all', () => {
      for (const subtotal of [1, 99, 100, 998, 999, 1000, 100000]) {
        expect(calculateShipping(subtotal, 1, OFF)).toBe(0)
      }
    })
  })

  it('defaults to charging when no settings are passed', () => {
    expect(DEFAULT_SHIPPING_SETTINGS.shippingEnabled).toBe(true)
    expect(calculateShipping(400, 1)).toBe(SHIPPING_FEE)
  })

  describe('amountToFreeShipping', () => {
    it('reports the gap to the threshold', () => {
      expect(amountToFreeShipping(400, ON)).toBe(FREE_SHIPPING_THRESHOLD + 1 - 400)
    })

    it('is zero once the threshold is cleared', () => {
      expect(amountToFreeShipping(FREE_SHIPPING_THRESHOLD + 1, ON)).toBe(0)
      expect(amountToFreeShipping(5999, ON)).toBe(0)
    })

    it('is zero when the toggle is off, so no nudge is shown', () => {
      expect(amountToFreeShipping(0, OFF)).toBe(0)
      expect(amountToFreeShipping(400, OFF)).toBe(0)
    })
  })
})
