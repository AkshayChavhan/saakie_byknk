/**
 * Shipping maths shared by the storefront (cart summary, checkout page) and
 * the server (order creation, payment intent). Keep it free of server-only
 * imports — the browser bundles it too.
 *
 * Whether shipping is charged at all is an admin setting (see
 * lib/server/settings.ts and /admin/settings); the fee and the free-shipping
 * threshold are fixed here.
 */

/** Flat fee charged when shipping applies, in rupees. */
export const SHIPPING_FEE = 99

/** Subtotals strictly above this ship free, in rupees. */
export const FREE_SHIPPING_THRESHOLD = 999

export interface ShippingSettings {
  /** Admin toggle: when false every order ships free. */
  shippingEnabled: boolean
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = { shippingEnabled: true }

/**
 * Shipping to charge for a cart.
 *
 * ₹0 when the admin has switched shipping off, when there is nothing to ship,
 * or when the subtotal clears the free-shipping threshold; otherwise the flat
 * fee.
 */
export function calculateShipping(
  subtotal: number,
  itemCount: number,
  settings: ShippingSettings = DEFAULT_SHIPPING_SETTINGS
): number {
  if (!settings.shippingEnabled) return 0
  if (itemCount <= 0) return 0
  if (subtotal > FREE_SHIPPING_THRESHOLD) return 0
  return SHIPPING_FEE
}

/**
 * How much more the customer must add to ship free, or 0 when shipping is
 * already free (threshold cleared, or switched off). Drives the cart nudge.
 */
export function amountToFreeShipping(
  subtotal: number,
  settings: ShippingSettings = DEFAULT_SHIPPING_SETTINGS
): number {
  if (!settings.shippingEnabled) return 0
  // Mirror calculateShipping's `> threshold` test exactly. Prices are Floats,
  // so a subtotal can land between the threshold and the next rupee (₹999.50):
  // without this guard the panel would say "Shipping FREE" and "Add ₹0.50 more
  // for FREE shipping!" at the same time.
  if (subtotal > FREE_SHIPPING_THRESHOLD) return 0
  return FREE_SHIPPING_THRESHOLD + 1 - subtotal
}
