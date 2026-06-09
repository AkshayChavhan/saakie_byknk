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
