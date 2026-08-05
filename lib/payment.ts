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

/**
 * A concrete instrument the shopper picks at checkout. Every channel except
 * `cod` resolves to the PREPAID mode and is fulfilled by the Razorpay modal —
 * we only use the channel to pin the modal to the block the shopper chose.
 */
export type PaymentChannel = 'upi' | 'card' | 'netbanking' | 'wallet' | 'cod'

export interface PaymentChannelInfo {
  id: PaymentChannel
  label: string
  /** One-line summary shown next to the radio. */
  blurb: string
  mode: PaymentMode
  /** Brand names listed under the option, Flipkart-style. */
  brands: string[]
  /** Copy shown in the expanded panel once selected. */
  detail: string
}

/** Ordered exactly as rendered at checkout — UPI first, COD last. */
export const PAYMENT_CHANNELS: PaymentChannelInfo[] = [
  {
    id: 'upi',
    label: 'UPI',
    blurb: 'Pay by any UPI app',
    mode: 'PREPAID',
    brands: ['Google Pay', 'PhonePe', 'Paytm', 'BHIM'],
    detail: 'Approve the payment in your UPI app. Nothing is charged until you confirm.',
  },
  {
    id: 'card',
    label: 'Credit / Debit Card',
    blurb: 'Visa, Mastercard, RuPay, Amex',
    mode: 'PREPAID',
    brands: ['Visa', 'Mastercard', 'RuPay', 'Amex'],
    detail: 'Card details are entered on the secure Razorpay window. We never see or store them.',
  },
  {
    id: 'netbanking',
    label: 'Net Banking',
    blurb: 'All major banks supported',
    mode: 'PREPAID',
    brands: ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak'],
    detail: "You'll be taken to your bank's page to authorise the payment.",
  },
  {
    id: 'wallet',
    label: 'Wallets',
    blurb: 'Paytm, Amazon Pay, Freecharge & more',
    mode: 'PREPAID',
    brands: ['Paytm', 'Amazon Pay', 'Freecharge', 'Mobikwik'],
    detail: 'Pay from your wallet balance in one tap.',
  },
  {
    id: 'cod',
    label: 'Cash on Delivery',
    blurb: 'Pay in cash when your order arrives',
    mode: 'COD',
    brands: [],
    detail: 'Please keep the exact amount ready. Our courier cannot always provide change.',
  },
]

const CHANNEL_IDS = PAYMENT_CHANNELS.map((c) => c.id)

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

// ── Channels ────────────────────────────────────────────────────────────────

/** Type guard for an untrusted channel id (request bodies, query strings). */
export function isPaymentChannel(value: unknown): value is PaymentChannel {
  return typeof value === 'string' && (CHANNEL_IDS as string[]).includes(value)
}

export function getPaymentChannel(id: unknown): PaymentChannelInfo | undefined {
  return isPaymentChannel(id) ? PAYMENT_CHANNELS.find((c) => c.id === id) : undefined
}

export interface ChannelAvailability {
  /** Every cart item accepts COD (per-product `paymentModes`). */
  allowCod: boolean
  /** Every cart item accepts prepaid payment. */
  allowOnline: boolean
  /** False when the Razorpay publishable key is missing. Defaults to true. */
  onlineConfigured?: boolean
  /** The store-wide COD switch an admin controls. Defaults to true. */
  codEnabled?: boolean
}

/**
 * Whether a channel can be offered. COD must clear BOTH gates — the store-wide
 * admin switch and every product's own `paymentModes`.
 */
export function isChannelAvailable(channel: PaymentChannel, opts: ChannelAvailability): boolean {
  const info = getPaymentChannel(channel)
  if (!info) return false
  if (info.mode === 'COD') return opts.codEnabled !== false && opts.allowCod
  return opts.allowOnline && opts.onlineConfigured !== false
}

/** The channels a shopper may pick, in render order. Empty means checkout is blocked. */
export function availableChannels(opts: ChannelAvailability): PaymentChannelInfo[] {
  return PAYMENT_CHANNELS.filter((c) => isChannelAvailable(c.id, opts))
}

/** Shown wherever COD is switched off store-wide. */
export const COD_DISABLED_MESSAGE =
  'Cash on Delivery is currently unavailable. Please choose an online payment method.'

/**
 * Server-side gate for the store-wide switches — the authoritative check both
 * order-creation routes run before writing an order. Returns the rejection
 * reason, or null when the method is permitted.
 *
 * Kept separate from the per-product `isMethodAllowed` check so the shopper
 * gets an accurate reason: "we've turned COD off" rather than "this product
 * doesn't take COD".
 */
export function storeBlockReason(
  method: string | null | undefined,
  settings: { codEnabled: boolean }
): string | null {
  if (normalizePaymentMethod(method) === 'COD' && !settings.codEnabled) {
    return COD_DISABLED_MESSAGE
  }
  return null
}

/**
 * What to persist on `Order.paymentMethod`. We store the concrete instrument
 * ("UPI", "CARD", …) so admins can see how an order was paid;
 * `normalizePaymentMethod()` still maps every one of them back to COD/PREPAID,
 * so the mode checks are unaffected.
 */
export function storedPaymentMethod(mode: PaymentMode, channel?: unknown): string {
  if (mode === 'COD') return 'COD'
  const info = getPaymentChannel(channel)
  return info && info.mode === 'PREPAID' ? info.id.toUpperCase() : 'PREPAID'
}

/** Display label for a persisted `Order.paymentMethod` value. */
export function describePaymentMethod(stored?: string | null): string {
  const value = String(stored ?? '').trim().toUpperCase()
  if (value === 'COD') return 'Cash on Delivery'
  const info = PAYMENT_CHANNELS.find((c) => c.id.toUpperCase() === value)
  return info ? info.label : 'Prepaid (online)'
}

/**
 * Shape check for a UPI VPA (`name@bank`). Used only to prefill the Razorpay
 * modal — Razorpay performs the authoritative validation.
 */
export function isValidUpiId(value: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(value.trim())
}
