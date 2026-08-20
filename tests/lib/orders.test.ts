import { describe, it, expect } from 'vitest'
import {
  getOrderRemoval,
  ORDER_REMOVAL_STATUS,
  statusLabel,
  type OrderRemovalReason,
} from '@/lib/orders'

/** Every OrderStatus the schema defines. */
const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
] as const

/** Every PaymentStatus the schema defines. */
const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'CANCELLED',
] as const

const removal = (status: string, paymentStatus: string) =>
  getOrderRemoval({ status, paymentStatus })

describe('getOrderRemoval', () => {
  describe('orders the customer may cancel and clear away', () => {
    it.each(['PENDING', 'CONFIRMED', 'PROCESSING'])(
      'allows cancelling an unpaid %s order',
      (status) => {
        const result = removal(status, 'PENDING')

        expect(result.canRemove).toBe(true)
        expect(result.cancelFirst).toBe(true)
        expect(result.reason).toBe('OK')
      }
    )

    it('allows cancelling after a failed payment attempt', () => {
      const result = removal('PENDING', 'FAILED')

      expect(result.canRemove).toBe(true)
      expect(result.cancelFirst).toBe(true)
    })
  })

  describe('orders that are already over', () => {
    it.each(['CANCELLED', 'REFUNDED', 'RETURNED'])(
      'lets a %s order be cleared away without cancelling it again',
      (status) => {
        const result = removal(status, 'PENDING')

        expect(result.canRemove).toBe(true)
        expect(result.cancelFirst).toBe(false)
        expect(result.reason).toBe('ALREADY_CLOSED')
      }
    )

    it('lets a refunded order go even though it was once paid', () => {
      // Closed is checked before paid, so money that has already been returned
      // does not strand the row on the customer's list forever.
      const result = removal('REFUNDED', 'REFUNDED')

      expect(result.canRemove).toBe(true)
      expect(result.reason).toBe('ALREADY_CLOSED')
    })

    it('lets an admin-cancelled order that was paid be cleared away', () => {
      const result = removal('CANCELLED', 'PAID')

      expect(result.canRemove).toBe(true)
      expect(result.cancelFirst).toBe(false)
    })
  })

  describe('orders that are too far along', () => {
    it('refuses a paid order — a refund is not the customer’s to issue', () => {
      const result = removal('CONFIRMED', 'PAID')

      expect(result.canRemove).toBe(false)
      expect(result.reason).toBe('ALREADY_PAID')
      expect(result.message).toMatch(/already been paid/i)
    })

    it.each(['SHIPPED', 'OUT_FOR_DELIVERY'])(
      'refuses a %s order because the parcel has left',
      (status) => {
        const result = removal(status, 'PENDING')

        expect(result.canRemove).toBe(false)
        expect(result.reason).toBe('DISPATCHED')
      }
    )

    it('refuses a delivered order that was never marked paid', () => {
      // The goods are with the customer even though payment never landed in
      // the system, so this is a return rather than a cancellation.
      const result = removal('DELIVERED', 'PENDING')

      expect(result.canRemove).toBe(false)
      expect(result.reason).toBe('DELIVERED')
    })

    it('reports a delivered-and-paid order as paid', () => {
      // Payment is checked first: it is the more actionable explanation, since
      // it tells the customer there is money to get back.
      expect(removal('DELIVERED', 'PAID').reason).toBe('ALREADY_PAID')
    })
  })

  describe('across every status combination', () => {
    it('always returns a reason with a matching HTTP status', () => {
      for (const status of ORDER_STATUSES) {
        for (const paymentStatus of PAYMENT_STATUSES) {
          const result = removal(status, paymentStatus)
          expect(ORDER_REMOVAL_STATUS[result.reason]).toBeTypeOf('number')
        }
      }
    })

    it('never asks to cancel an order it will not remove', () => {
      // `cancelFirst` drives a write, so it must never be true where the route
      // is going to reject the request.
      for (const status of ORDER_STATUSES) {
        for (const paymentStatus of PAYMENT_STATUSES) {
          const result = removal(status, paymentStatus)
          if (!result.canRemove) expect(result.cancelFirst).toBe(false)
        }
      }
    })

    it('answers 200 exactly when removal is allowed', () => {
      for (const status of ORDER_STATUSES) {
        for (const paymentStatus of PAYMENT_STATUSES) {
          const result = removal(status, paymentStatus)
          expect(ORDER_REMOVAL_STATUS[result.reason] === 200).toBe(
            result.canRemove
          )
        }
      }
    })

    it('never leaves a paid, live order removable', () => {
      // The guard that matters most: no combination may let a customer cancel
      // an order the shop has taken money for.
      const live = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']
      for (const status of live) {
        expect(removal(status, 'PAID').canRemove).toBe(false)
      }
    })

    it('gives every reason a non-empty message', () => {
      const reasons: OrderRemovalReason[] = [
        'OK',
        'ALREADY_CLOSED',
        'ALREADY_PAID',
        'DISPATCHED',
        'DELIVERED',
      ]
      const seen = new Set<string>()
      for (const status of ORDER_STATUSES) {
        for (const paymentStatus of PAYMENT_STATUSES) {
          const result = removal(status, paymentStatus)
          expect(result.message.length).toBeGreaterThan(0)
          seen.add(result.reason)
        }
      }
      // Sanity: the matrix actually exercises every branch.
      expect([...seen].sort()).toEqual([...reasons].sort())
    })
  })
})

describe('statusLabel', () => {
  it('turns an enum status into words', () => {
    expect(statusLabel('OUT_FOR_DELIVERY')).toBe('Out For Delivery')
    expect(statusLabel('PENDING')).toBe('Pending')
  })
})
