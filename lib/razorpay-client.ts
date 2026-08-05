// Client-side Razorpay Checkout helpers. Loads the hosted checkout script on
// demand and opens the payment modal. Import only from client components.

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: (resp: unknown) => void) => void
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

// Razorpay's success handler payload.
export interface RazorpaySuccess {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

/** Inject the Razorpay checkout script once; resolves when it's ready. */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (window.Razorpay) return resolve(true)

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))
      return
    }

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/** The prepaid instruments our checkout offers as separate options. */
export type RazorpayChannel = 'upi' | 'card' | 'netbanking' | 'wallet'

/**
 * Razorpay's `payment.failed` payload. Only the fields we surface are typed.
 */
export interface RazorpayFailure {
  error?: {
    code?: string
    description?: string
    reason?: string
    step?: string
    source?: string
  }
}

const CHANNEL_LABELS: Record<RazorpayChannel, string> = {
  upi: 'Pay by UPI',
  card: 'Pay by Card',
  netbanking: 'Net Banking',
  wallet: 'Wallets',
}

/**
 * Put the channel the shopper picked at the TOP of the modal, without hiding
 * the rest.
 *
 * The first version of this restricted hard — `method: { upi: true, card: false, … }`.
 * That dead-ends: if the pinned method is not enabled on the Razorpay account,
 * the modal has zero instruments to render and shows "No appropriate payment
 * method found" with no way forward. `show_default_blocks: true` keeps the
 * other methods available underneath, so a mis-configured account degrades to a
 * normal checkout instead of a wall.
 */
export function preferredChannelConfig(channel?: RazorpayChannel) {
  if (!channel) return undefined
  return {
    display: {
      blocks: {
        preferred: {
          name: CHANNEL_LABELS[channel],
          instruments: [{ method: channel }],
        },
      },
      sequence: ['block.preferred'],
      preferences: { show_default_blocks: true },
    },
  }
}

export interface OpenCheckoutOptions {
  /** NEXT_PUBLIC_RAZORPAY_KEY_ID */
  key: string
  /** Razorpay order id (order_...) from /api/payments/create-intent */
  razorpayOrderId: string
  /** Amount in rupees (converted to paise here). */
  amount: number
  name?: string
  description?: string
  /** Open the modal directly on this method; omit to show all of them. */
  channel?: RazorpayChannel
  prefill?: { name?: string; email?: string; contact?: string; vpa?: string }
  onSuccess: (resp: RazorpaySuccess) => void
  /**
   * A payment attempt was declined. The modal stays open so the shopper can
   * retry — `onDismiss` still fires if they then close it.
   */
  onFailure?: (message: string, resp: RazorpayFailure) => void
  onDismiss?: () => void
}

const FAILURE_FALLBACK = 'The payment could not be completed. Please try again or pick another method.'

/**
 * Load the script (if needed) and open the Razorpay modal. Returns false if the
 * script could not load or the SDK is unavailable.
 */
export async function openRazorpayCheckout(opts: OpenCheckoutOptions): Promise<boolean> {
  const ok = await loadRazorpayScript()
  if (!ok || !window.Razorpay) return false

  const { vpa, ...contact } = opts.prefill ?? {}
  // `method` tells Razorpay which block to land on; `vpa` only applies to UPI.
  const prefill: Record<string, unknown> = { ...contact }
  if (opts.channel) prefill.method = opts.channel
  if (opts.channel === 'upi' && vpa) prefill.vpa = vpa

  const rzp = new window.Razorpay({
    key: opts.key,
    order_id: opts.razorpayOrderId,
    amount: Math.round(opts.amount * 100),
    currency: 'INR',
    name: opts.name ?? 'Saakie by KNK',
    description: opts.description ?? 'Order payment',
    prefill,
    config: preferredChannelConfig(opts.channel),
    theme: { color: '#161616' },
    handler: (resp: unknown) => opts.onSuccess(resp as RazorpaySuccess),
    modal: { ondismiss: () => opts.onDismiss?.() },
  })

  rzp.on('payment.failed', (resp: unknown) => {
    const failure = (resp ?? {}) as RazorpayFailure
    opts.onFailure?.(failure.error?.description || FAILURE_FALLBACK, failure)
  })

  rzp.open()
  return true
}
