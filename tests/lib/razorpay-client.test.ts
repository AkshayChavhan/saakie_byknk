import { describe, it, expect } from 'vitest'
import { preferredChannelConfig, type RazorpayChannel } from '@/lib/razorpay-client'

const CHANNELS: RazorpayChannel[] = ['upi', 'card', 'netbanking', 'wallet']

describe('preferredChannelConfig', () => {
  it('returns undefined when no channel was picked', () => {
    expect(preferredChannelConfig()).toBeUndefined()
    expect(preferredChannelConfig(undefined)).toBeUndefined()
  })

  it('puts the picked channel in the first block', () => {
    for (const channel of CHANNELS) {
      const config = preferredChannelConfig(channel)
      expect(config?.display.blocks.preferred.instruments).toEqual([{ method: channel }])
      expect(config?.display.sequence).toEqual(['block.preferred'])
    }
  })

  it('gives each channel a human-readable block name', () => {
    expect(preferredChannelConfig('upi')?.display.blocks.preferred.name).toBe('Pay by UPI')
    expect(preferredChannelConfig('netbanking')?.display.blocks.preferred.name).toBe('Net Banking')
  })

  // Regression guard. Hard-restricting to a single method makes Razorpay render
  // "No appropriate payment method found" whenever that method is not enabled on
  // the account. The other methods must stay reachable underneath.
  it('never hides the other payment methods', () => {
    for (const channel of CHANNELS) {
      const config = preferredChannelConfig(channel)
      expect(config?.display.preferences.show_default_blocks).toBe(true)
    }
  })

  it('does not emit a method allow-list that could empty the modal', () => {
    for (const channel of CHANNELS) {
      expect(preferredChannelConfig(channel)).not.toHaveProperty('method')
    }
  })
})
