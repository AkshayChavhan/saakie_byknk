// Shared presentation helpers for order status across the account page, the
// order-detail page, and the post-checkout confirmation page.

/** Tailwind badge classes per order/review status. */
export const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-gray-200 text-gray-700',
  REFUNDED: 'bg-gray-200 text-gray-700',
  // review statuses (reused on the account page)
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

/** Tailwind badge classes per payment status. */
export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-gray-200 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

/** Turn an enum-style status (e.g. OUT_FOR_DELIVERY) into "Out For Delivery". */
export function statusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Removing an order from "My Orders"
// ---------------------------------------------------------------------------

/**
 * Whether a customer may take one of their own orders off their list, and
 * whether it has to be cancelled on the way out.
 *
 * Deliberately pure and free of any Prisma import so the account page and
 * DELETE /api/orders/[id] decide from the same rule — a button that appears
 * must not lead to a 409, and one that is hidden must not be bypassable.
 *
 * The rule, in order:
 *
 * - An order that is already finished with (cancelled, refunded, returned) can
 *   always be cleared away. Nothing changes but the customer's view — this is
 *   how a payment that failed gets dismissed.
 * - Money already taken is the shop's problem to unwind, not something a
 *   customer may cancel behind our back. Refunds are issued from the payment
 *   gateway; nothing in this app initiates one.
 * - Goods already dispatched or delivered are a return, not a cancellation.
 * - Everything else — an unpaid order that has not left the building — the
 *   customer may cancel and clear away themselves.
 *
 * Stock deliberately needs no unwinding here: it is decremented only by the
 * payment webhooks once capture succeeds, so an order that was never paid for
 * never reserved any.
 */
export type OrderRemovalReason =
  | 'OK'
  | 'ALREADY_CLOSED'
  | 'ALREADY_PAID'
  | 'DISPATCHED'
  | 'DELIVERED'

export interface OrderRemoval {
  /** Whether the order may leave the customer's list at all. */
  canRemove: boolean
  /** Whether it is still live and must be cancelled before being hidden. */
  cancelFirst: boolean
  reason: OrderRemovalReason
  /** Shown to the customer verbatim when `canRemove` is false. */
  message: string
}

/** Statuses meaning the order is over — safe to clear away, nothing to cancel. */
const CLOSED_STATUSES = new Set(['CANCELLED', 'REFUNDED', 'RETURNED'])

/** Statuses meaning the parcel has left us. */
const DISPATCHED_STATUSES = new Set(['SHIPPED', 'OUT_FOR_DELIVERY'])

const REMOVAL_MESSAGES: Record<OrderRemovalReason, string> = {
  OK: 'This order can be cancelled and removed from your list.',
  ALREADY_CLOSED: 'This order is closed and can be removed from your list.',
  ALREADY_PAID:
    'This order has already been paid for, so it can no longer be cancelled here. Get in touch and we will sort out a refund.',
  DISPATCHED:
    'This order is already on its way, so it can no longer be cancelled. Get in touch once it arrives and we will arrange a return.',
  DELIVERED:
    'This order has already been delivered, so it can no longer be cancelled. Get in touch and we will arrange a return.',
}

/** HTTP status the API answers with for each blocked reason. */
export const ORDER_REMOVAL_STATUS: Record<OrderRemovalReason, number> = {
  OK: 200,
  ALREADY_CLOSED: 200,
  ALREADY_PAID: 409,
  DISPATCHED: 409,
  DELIVERED: 409,
}

export function getOrderRemoval(order: {
  status: string
  paymentStatus: string
}): OrderRemoval {
  if (CLOSED_STATUSES.has(order.status)) return removal('ALREADY_CLOSED')
  if (order.paymentStatus === 'PAID') return removal('ALREADY_PAID')
  if (order.status === 'DELIVERED') return removal('DELIVERED')
  if (DISPATCHED_STATUSES.has(order.status)) return removal('DISPATCHED')
  return removal('OK')
}

function removal(reason: OrderRemovalReason): OrderRemoval {
  return {
    canRemove: reason === 'OK' || reason === 'ALREADY_CLOSED',
    cancelFirst: reason === 'OK',
    reason,
    message: REMOVAL_MESSAGES[reason],
  }
}
