/**
 * Pre-booking: a sold-out saree can still be ordered. The customer pays now
 * and the piece is delivered 15–20 days after the order is placed.
 *
 * One rule decides it everywhere (product page, cart, checkout, payment
 * settlement): an active product with no stock left is pre-bookable. A line
 * for a product that still has stock follows the normal stock limits.
 */

export const PREBOOK_DELIVERY_DAYS = { min: 15, max: 20 } as const

/** "15–20 days", for labels. */
export const PREBOOK_DELIVERY_WINDOW = `${PREBOOK_DELIVERY_DAYS.min}–${PREBOOK_DELIVERY_DAYS.max} days`

/** True when the product is sold out but still on sale, so it can be pre-booked. */
export function isPrebookable(product: { stock: number; isActive?: boolean | null }): boolean {
  return product.stock <= 0 && product.isActive !== false
}

/** The popover shown on the Pre-book button. */
export const PREBOOK_MESSAGE = {
  title: 'Your favourite saree is worth the wait!',
  paragraphs: [
    `This saree is available for pre-booking. Our pre-booked sarees require ${PREBOOK_DELIVERY_WINDOW} for delivery from the date your order is placed.`,
    'Each beautiful drape is worth waiting for, and we appreciate your patience while you await your special piece.',
  ],
} as const

/** Short line for cart, checkout and order pages. */
export const PREBOOK_LINE_NOTE = `Pre-book · delivered ${PREBOOK_DELIVERY_WINDOW} after ordering`
