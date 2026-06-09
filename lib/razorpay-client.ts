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

export interface OpenCheckoutOptions {
  /** NEXT_PUBLIC_RAZORPAY_KEY_ID */
  key: string
  /** Razorpay order id (order_...) from /api/payments/create-intent */
  razorpayOrderId: string
  /** Amount in rupees (converted to paise here). */
  amount: number
  name?: string
  description?: string
  prefill?: { name?: string; email?: string; contact?: string }
  onSuccess: (resp: RazorpaySuccess) => void
  onDismiss?: () => void
}

/**
 * Load the script (if needed) and open the Razorpay modal. Returns false if the
 * script could not load or the SDK is unavailable.
 */
export async function openRazorpayCheckout(opts: OpenCheckoutOptions): Promise<boolean> {
  const ok = await loadRazorpayScript()
  if (!ok || !window.Razorpay) return false

  const rzp = new window.Razorpay({
    key: opts.key,
    order_id: opts.razorpayOrderId,
    amount: Math.round(opts.amount * 100),
    currency: 'INR',
    name: opts.name ?? 'Saakie by KNK',
    description: opts.description ?? 'Order payment',
    prefill: opts.prefill ?? {},
    theme: { color: '#161616' },
    handler: (resp: unknown) => opts.onSuccess(resp as RazorpaySuccess),
    modal: { ondismiss: () => opts.onDismiss?.() },
  })
  rzp.open()
  return true
}
