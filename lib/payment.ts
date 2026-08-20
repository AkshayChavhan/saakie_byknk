/**
 * Payment helpers shared by the storefront (client) and the order APIs
 * (server). Pure functions only — safe to import anywhere.
 *
 * The store is prepaid-only: every order is paid online through the payment
 * gateway before it is placed.
 */

/**
 * A concrete instrument the shopper picks at checkout. Every channel is
 * fulfilled by the Razorpay modal — we only use the channel to pin the modal
 * to the block the shopper chose.
 */
export type PaymentChannel = 'upi' | 'card' | 'netbanking' | 'wallet'

export interface PaymentChannelInfo {
  id: PaymentChannel
  label: string
  /** One-line summary shown next to the radio. */
  blurb: string
  /** Brand names listed under the option, Flipkart-style. */
  brands: string[]
  /** Copy shown in the expanded panel once selected. */
  detail: string
}

/** Ordered exactly as rendered at checkout — UPI first. */
export const PAYMENT_CHANNELS: PaymentChannelInfo[] = [
  {
    id: 'upi',
    label: 'UPI',
    blurb: 'Pay by any UPI app',
    brands: ['Google Pay', 'PhonePe', 'Paytm', 'BHIM'],
    detail: 'Approve the payment in your UPI app. Nothing is charged until you confirm.',
  },
  {
    id: 'card',
    label: 'Credit / Debit Card',
    blurb: 'Visa, Mastercard, RuPay, Amex',
    brands: ['Visa', 'Mastercard', 'RuPay', 'Amex'],
    detail: 'Card details are entered on the secure Razorpay window. We never see or store them.',
  },
  {
    id: 'netbanking',
    label: 'Net Banking',
    blurb: 'All major banks supported',
    brands: ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak'],
    detail: "You'll be taken to your bank's page to authorise the payment.",
  },
  {
    id: 'wallet',
    label: 'Wallets',
    blurb: 'Paytm, Amazon Pay, Freecharge & more',
    brands: ['Paytm', 'Amazon Pay', 'Freecharge', 'Mobikwik'],
    detail: 'Pay from your wallet balance in one tap.',
  },
]

const CHANNEL_IDS = PAYMENT_CHANNELS.map((c) => c.id)

// ── Channels ────────────────────────────────────────────────────────────────

/** Type guard for an untrusted channel id (request bodies, query strings). */
export function isPaymentChannel(value: unknown): value is PaymentChannel {
  return typeof value === 'string' && (CHANNEL_IDS as string[]).includes(value)
}

export function getPaymentChannel(id: unknown): PaymentChannelInfo | undefined {
  return isPaymentChannel(id) ? PAYMENT_CHANNELS.find((c) => c.id === id) : undefined
}

export interface ChannelAvailability {
  /** False when the Razorpay publishable key is missing. Defaults to true. */
  onlineConfigured?: boolean
}

/** Whether a channel can be offered. */
export function isChannelAvailable(channel: PaymentChannel, opts: ChannelAvailability): boolean {
  if (!getPaymentChannel(channel)) return false
  return opts.onlineConfigured !== false
}

/** The channels a shopper may pick, in render order. Empty means checkout is blocked. */
export function availableChannels(opts: ChannelAvailability): PaymentChannelInfo[] {
  return PAYMENT_CHANNELS.filter((c) => isChannelAvailable(c.id, opts))
}

/**
 * What to persist on `Order.paymentMethod`. We store the concrete instrument
 * ("UPI", "CARD", …) so admins can see how an order was paid.
 */
export function storedPaymentMethod(channel?: unknown): string {
  const info = getPaymentChannel(channel)
  return info ? info.id.toUpperCase() : 'PREPAID'
}

/**
 * Display label for a persisted `Order.paymentMethod` value. The COD branch
 * only serves orders placed before Cash on Delivery was removed from the
 * store — those rows still carry the literal string "COD".
 */
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
