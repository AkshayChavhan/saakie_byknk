import { describe, it, expect } from 'vitest'
import {
  PAYMENT_CHANNELS,
  availableChannels,
  describePaymentMethod,
  getPaymentChannel,
  isChannelAvailable,
  isPaymentChannel,
  isValidUpiId,
  storedPaymentMethod,
} from '@/lib/payment'

describe('payment channels', () => {
  it('offers UPI first', () => {
    expect(PAYMENT_CHANNELS[0].id).toBe('upi')
  })

  it('offers exactly the four prepaid channels', () => {
    expect(PAYMENT_CHANNELS.map((c) => c.id)).toEqual(['upi', 'card', 'netbanking', 'wallet'])
  })

  describe('isPaymentChannel', () => {
    it('accepts known ids only', () => {
      expect(isPaymentChannel('upi')).toBe(true)
      expect(isPaymentChannel('cod')).toBe(false)
      expect(isPaymentChannel('emi')).toBe(false)
      expect(isPaymentChannel('UPI')).toBe(false)
      expect(isPaymentChannel(null)).toBe(false)
      expect(isPaymentChannel(42)).toBe(false)
    })
  })

  describe('getPaymentChannel', () => {
    it('returns the matching entry, or undefined', () => {
      expect(getPaymentChannel('card')?.label).toBe('Credit / Debit Card')
      expect(getPaymentChannel('nope')).toBeUndefined()
    })
  })

  describe('isChannelAvailable', () => {
    it('offers every channel while the gateway is configured', () => {
      for (const channel of ['upi', 'card', 'netbanking', 'wallet'] as const) {
        expect(isChannelAvailable(channel, { onlineConfigured: true })).toBe(true)
      }
    })

    it('hides every channel when the gateway key is missing', () => {
      for (const channel of ['upi', 'card', 'netbanking', 'wallet'] as const) {
        expect(isChannelAvailable(channel, { onlineConfigured: false })).toBe(false)
      }
    })

    it('treats a missing onlineConfigured flag as configured', () => {
      expect(isChannelAvailable('upi', {})).toBe(true)
    })

    it('rejects unknown channels', () => {
      expect(isChannelAvailable('emi' as never, { onlineConfigured: true })).toBe(false)
    })
  })

  describe('availableChannels', () => {
    it('returns every channel when the gateway is configured', () => {
      const ids = availableChannels({ onlineConfigured: true }).map((c) => c.id)
      expect(ids).toEqual(['upi', 'card', 'netbanking', 'wallet'])
    })

    it('returns nothing when the gateway is not configured', () => {
      expect(availableChannels({ onlineConfigured: false })).toEqual([])
    })
  })

  describe('storedPaymentMethod', () => {
    it('stores the concrete instrument', () => {
      expect(storedPaymentMethod('upi')).toBe('UPI')
      expect(storedPaymentMethod('netbanking')).toBe('NETBANKING')
    })

    it('falls back to PREPAID for a missing or bogus channel', () => {
      expect(storedPaymentMethod()).toBe('PREPAID')
      expect(storedPaymentMethod('emi')).toBe('PREPAID')
      expect(storedPaymentMethod('cod')).toBe('PREPAID')
    })
  })

  describe('describePaymentMethod', () => {
    it('labels stored instruments', () => {
      expect(describePaymentMethod('UPI')).toBe('UPI')
      expect(describePaymentMethod('CARD')).toBe('Credit / Debit Card')
      expect(describePaymentMethod('NETBANKING')).toBe('Net Banking')
    })

    it('labels legacy COD orders placed before COD was removed', () => {
      expect(describePaymentMethod('COD')).toBe('Cash on Delivery')
    })

    it('falls back for legacy and unknown values', () => {
      expect(describePaymentMethod('PREPAID')).toBe('Prepaid (online)')
      expect(describePaymentMethod('razorpay')).toBe('Prepaid (online)')
      expect(describePaymentMethod(null)).toBe('Prepaid (online)')
    })
  })

  describe('isValidUpiId', () => {
    it('accepts well-formed VPAs', () => {
      expect(isValidUpiId('akshay@okhdfcbank')).toBe(true)
      expect(isValidUpiId('  akshay.c-1_x@ybl  ')).toBe(true)
    })

    it('rejects malformed input', () => {
      expect(isValidUpiId('')).toBe(false)
      expect(isValidUpiId('akshay')).toBe(false)
      expect(isValidUpiId('a@b')).toBe(false)
      expect(isValidUpiId('akshay@ybl1')).toBe(false)
      expect(isValidUpiId('akshay@@ybl')).toBe(false)
    })
  })
})
