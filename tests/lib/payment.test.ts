import { describe, it, expect } from 'vitest'
import {
  COD_DISABLED_MESSAGE,
  PAYMENT_CHANNELS,
  availableChannels,
  describeModes,
  describePaymentMethod,
  effectiveModes,
  getPaymentChannel,
  isChannelAvailable,
  isMethodAllowed,
  isPaymentChannel,
  isValidUpiId,
  normalizePaymentMethod,
  storeBlockReason,
  storedPaymentMethod,
} from '@/lib/payment'

describe('payment modes', () => {
  describe('normalizePaymentMethod', () => {
    it('maps COD in any case to COD', () => {
      expect(normalizePaymentMethod('COD')).toBe('COD')
      expect(normalizePaymentMethod('cod')).toBe('COD')
      expect(normalizePaymentMethod(' Cod ')).toBe('COD')
    })

    it('maps gateways, instruments and empties to PREPAID', () => {
      for (const value of ['razorpay', 'stripe', 'PREPAID', 'UPI', 'CARD', '', null, undefined]) {
        expect(normalizePaymentMethod(value)).toBe('PREPAID')
      }
    })
  })

  describe('effectiveModes', () => {
    it('falls back to prepaid-only when unset', () => {
      expect(effectiveModes(null)).toEqual(['PREPAID'])
      expect(effectiveModes([])).toEqual(['PREPAID'])
    })

    it('normalizes configured modes', () => {
      expect(effectiveModes(['cod', 'prepaid'])).toEqual(['COD', 'PREPAID'])
    })
  })

  describe('isMethodAllowed', () => {
    it('honours the product modes', () => {
      expect(isMethodAllowed('COD', ['COD'])).toBe(true)
      expect(isMethodAllowed('razorpay', ['COD'])).toBe(false)
      expect(isMethodAllowed('razorpay', ['COD', 'PREPAID'])).toBe(true)
    })
  })

  describe('describeModes', () => {
    it('labels each combination', () => {
      expect(describeModes(['COD', 'PREPAID'])).toBe('COD & Prepaid')
      expect(describeModes(['COD'])).toBe('Cash on Delivery only')
      expect(describeModes(null)).toBe('Prepaid only')
    })
  })
})

describe('payment channels', () => {
  it('offers UPI first and COD last', () => {
    expect(PAYMENT_CHANNELS[0].id).toBe('upi')
    expect(PAYMENT_CHANNELS[PAYMENT_CHANNELS.length - 1].id).toBe('cod')
  })

  it('marks only COD as the COD mode', () => {
    const cod = PAYMENT_CHANNELS.filter((c) => c.mode === 'COD')
    expect(cod.map((c) => c.id)).toEqual(['cod'])
  })

  describe('isPaymentChannel', () => {
    it('accepts known ids only', () => {
      expect(isPaymentChannel('upi')).toBe(true)
      expect(isPaymentChannel('cod')).toBe(true)
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
    const both = { allowCod: true, allowOnline: true, onlineConfigured: true }

    it('gates COD on the cart allowing COD', () => {
      expect(isChannelAvailable('cod', both)).toBe(true)
      expect(isChannelAvailable('cod', { ...both, allowCod: false })).toBe(false)
    })

    it('gates prepaid channels on the cart allowing prepaid', () => {
      expect(isChannelAvailable('upi', both)).toBe(true)
      expect(isChannelAvailable('upi', { ...both, allowOnline: false })).toBe(false)
    })

    it('hides prepaid channels when the gateway key is missing', () => {
      expect(isChannelAvailable('card', { ...both, onlineConfigured: false })).toBe(false)
      expect(isChannelAvailable('cod', { ...both, onlineConfigured: false })).toBe(true)
    })

    it('treats a missing onlineConfigured flag as configured', () => {
      expect(isChannelAvailable('upi', { allowCod: false, allowOnline: true })).toBe(true)
    })

    it('rejects unknown channels', () => {
      expect(isChannelAvailable('emi' as never, both)).toBe(false)
    })

    it('gates COD on the store-wide admin switch', () => {
      expect(isChannelAvailable('cod', { ...both, codEnabled: false })).toBe(false)
      expect(isChannelAvailable('cod', { ...both, codEnabled: true })).toBe(true)
    })

    it('leaves prepaid channels alone when COD is switched off', () => {
      for (const channel of ['upi', 'card', 'netbanking', 'wallet'] as const) {
        expect(isChannelAvailable(channel, { ...both, codEnabled: false })).toBe(true)
      }
    })

    it('treats a missing codEnabled flag as on, preserving pre-switch behaviour', () => {
      expect(isChannelAvailable('cod', { allowCod: true, allowOnline: true })).toBe(true)
    })

    it('needs BOTH gates for COD — the switch cannot re-enable a prepaid-only cart', () => {
      expect(isChannelAvailable('cod', { ...both, allowCod: false, codEnabled: true })).toBe(false)
    })
  })

  describe('availableChannels', () => {
    it('returns every channel when the cart allows both modes', () => {
      const ids = availableChannels({ allowCod: true, allowOnline: true, onlineConfigured: true }).map((c) => c.id)
      expect(ids).toEqual(['upi', 'card', 'netbanking', 'wallet', 'cod'])
    })

    it('returns COD alone for a COD-only cart', () => {
      const ids = availableChannels({ allowCod: true, allowOnline: false, onlineConfigured: true }).map((c) => c.id)
      expect(ids).toEqual(['cod'])
    })

    it('returns nothing when no mode is payable', () => {
      expect(availableChannels({ allowCod: false, allowOnline: false, onlineConfigured: true })).toEqual([])
    })

    it('drops COD when the admin has switched it off store-wide', () => {
      const ids = availableChannels({
        allowCod: true,
        allowOnline: true,
        onlineConfigured: true,
        codEnabled: false,
      }).map((c) => c.id)
      expect(ids).toEqual(['upi', 'card', 'netbanking', 'wallet'])
    })

    it('blocks checkout entirely for a COD-only cart while COD is switched off', () => {
      expect(
        availableChannels({
          allowCod: true,
          allowOnline: false,
          onlineConfigured: true,
          codEnabled: false,
        })
      ).toEqual([])
    })
  })

  describe('storeBlockReason', () => {
    it('blocks COD when the store-wide switch is off', () => {
      expect(storeBlockReason('COD', { codEnabled: false })).toBe(COD_DISABLED_MESSAGE)
      expect(storeBlockReason('cod', { codEnabled: false })).toBe(COD_DISABLED_MESSAGE)
    })

    it('allows COD when the switch is on', () => {
      expect(storeBlockReason('COD', { codEnabled: true })).toBeNull()
    })

    it('never blocks prepaid, switch on or off', () => {
      for (const method of ['razorpay', 'stripe', 'PREPAID', 'UPI', '', null, undefined]) {
        expect(storeBlockReason(method, { codEnabled: false })).toBeNull()
        expect(storeBlockReason(method, { codEnabled: true })).toBeNull()
      }
    })
  })

  describe('storedPaymentMethod', () => {
    it('stores COD regardless of channel', () => {
      expect(storedPaymentMethod('COD', 'upi')).toBe('COD')
      expect(storedPaymentMethod('COD')).toBe('COD')
    })

    it('stores the concrete prepaid instrument', () => {
      expect(storedPaymentMethod('PREPAID', 'upi')).toBe('UPI')
      expect(storedPaymentMethod('PREPAID', 'netbanking')).toBe('NETBANKING')
    })

    it('falls back to PREPAID for a missing or bogus channel', () => {
      expect(storedPaymentMethod('PREPAID')).toBe('PREPAID')
      expect(storedPaymentMethod('PREPAID', 'emi')).toBe('PREPAID')
      // 'cod' is a COD-mode channel — it must not label a prepaid order.
      expect(storedPaymentMethod('PREPAID', 'cod')).toBe('PREPAID')
    })

    it('stays readable by normalizePaymentMethod', () => {
      for (const channel of ['upi', 'card', 'netbanking', 'wallet']) {
        expect(normalizePaymentMethod(storedPaymentMethod('PREPAID', channel))).toBe('PREPAID')
      }
      expect(normalizePaymentMethod(storedPaymentMethod('COD', 'cod'))).toBe('COD')
    })
  })

  describe('describePaymentMethod', () => {
    it('labels stored instruments', () => {
      expect(describePaymentMethod('UPI')).toBe('UPI')
      expect(describePaymentMethod('CARD')).toBe('Credit / Debit Card')
      expect(describePaymentMethod('NETBANKING')).toBe('Net Banking')
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
