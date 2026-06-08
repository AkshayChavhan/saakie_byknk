/**
 * Payment-mode helpers shared by the storefront (client) and the order APIs
 * (server). Pure functions only — safe to import anywhere.
 *
 * A product defines which payment modes it accepts via `Product.paymentModes`
 * (values `COD` / `PREPAID`, where PREPAID = pay via the online gateway). When a
 * product has no modes set (e.g. legacy rows created before the field existed),
 * it is treated as prepaid-only — matching the schema default `@default([PREPAID])`.
 */

export type PaymentMode = 'COD' | 'PREPAID'

const DEFAULT_MODES: PaymentMode[] = ['PREPAID']

/**
 * Map any incoming payment method/gateway string to a canonical mode.
 * `'COD'` (any case) → COD; everything else (razorpay, stripe, prepaid,
 * gateway names, empty) → PREPAID.
 */
export function normalizePaymentMethod(method?: string | null): PaymentMode {
  return String(method ?? '').trim().toUpperCase() === 'COD' ? 'COD' : 'PREPAID'
}

/**
 * The modes a product effectively accepts. Falls back to the prepaid-only
 * default when the product has no modes configured.
 */
export function effectiveModes(modes?: string[] | null): PaymentMode[] {
  if (Array.isArray(modes) && modes.length > 0) {
    return modes.map((m) => normalizePaymentMethod(m))
  }
  return DEFAULT_MODES
}

/** Whether a chosen payment method is allowed for a product's modes. */
export function isMethodAllowed(
  method: string | null | undefined,
  modes?: string[] | null
): boolean {
  return effectiveModes(modes).includes(normalizePaymentMethod(method))
}

/** Human-readable label for an accepted-modes badge, e.g. "COD & Prepaid". */
export function describeModes(modes?: string[] | null): string {
  const eff = effectiveModes(modes)
  const hasCod = eff.includes('COD')
  const hasPrepaid = eff.includes('PREPAID')
  if (hasCod && hasPrepaid) return 'COD & Prepaid'
  if (hasCod) return 'Cash on Delivery only'
  return 'Prepaid only'
}
