'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, MapPin, CreditCard, Plus, ShieldCheck } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PaymentMethods } from '@/components/checkout/payment-methods'
import { formatPrice, cn } from '@/lib/utils'
import { cartApi, userApi, fetchApi } from '@/lib/api'
import { availableChannels, isMethodAllowed, isValidUpiId, type PaymentChannel } from '@/lib/payment'
import { openRazorpayCheckout, type RazorpaySuccess } from '@/lib/razorpay-client'

interface CartItem {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    paymentModes?: string[]
    images?: { url: string }[]
  }
}

interface Address {
  id: string
  name: string
  phone: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
}

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const isLoaded = status !== 'loading'
  const isSignedIn = status === 'authenticated'

  const [items, setItems] = useState<CartItem[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [savingAddress, setSavingAddress] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [channel, setChannel] = useState<PaymentChannel | null>(null)
  const [upiId, setUpiId] = useState('')
  /** Store-wide COD switch from /api/store-settings; assume on until told otherwise. */
  const [codEnabled, setCodEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [cart, addrs, store] = await Promise.all([
        cartApi.get(),
        userApi.getAddresses(),
        // Advisory only — the order API re-checks. If it fails we leave COD on
        // and let the server be the one to refuse.
        fetchApi('/api/store-settings')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ])
      if (typeof store?.codEnabled === 'boolean') setCodEnabled(store.codEnabled)
      const cartItems: CartItem[] = cart?.items ?? []
      setItems(cartItems)
      const list: Address[] = Array.isArray(addrs) ? addrs : []
      setAddresses(list)
      setSelectedAddressId(list.find((a) => a.isDefault)?.id || list[0]?.id || '')
      if (list.length === 0) setShowAddressForm(true)
    } catch (e) {
      console.error('Checkout load failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isSignedIn) load()
    else if (isLoaded) setLoading(false)
  }, [isLoaded, isSignedIn, load])

  // Totals — mirrors the server math in /api/payments/create-intent.
  const subtotal = items.reduce((t, i) => t + i.price * i.quantity, 0)
  const shipping = subtotal > 999 ? 0 : items.length > 0 ? 99 : 0
  const total = subtotal + shipping

  // Which payment modes ALL cart items allow (intersection via every-item check).
  const allowCod = items.length > 0 && items.every((i) => isMethodAllowed('COD', i.product.paymentModes))
  const allowOnline =
    items.length > 0 && items.every((i) => isMethodAllowed('PREPAID', i.product.paymentModes))
  const onlineConfigured = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)

  const channels = useMemo(
    () => availableChannels({ allowCod, allowOnline, onlineConfigured, codEnabled }),
    [allowCod, allowOnline, onlineConfigured, codEnabled]
  )

  // Preselect the first offered channel (UPI whenever prepaid is on), and drop a
  // selection that stops being offered — e.g. after the cart changes.
  useEffect(() => {
    setChannel((current) =>
      current && channels.some((c) => c.id === current) ? current : channels[0]?.id ?? null
    )
  }, [channels])

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId)

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingAddress(true)
    setError(null)
    try {
      const created: Address = await userApi.addAddress(form)
      setAddresses((prev) => [created, ...prev])
      setSelectedAddressId(created.id)
      setShowAddressForm(false)
      setForm(EMPTY_FORM)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save address')
    } finally {
      setSavingAddress(false)
    }
  }

  const createOrder = async (gateway: 'cod' | 'razorpay', paymentChannel: PaymentChannel) => {
    const res = await fetchApi('/api/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentGateway: gateway,
        paymentChannel,
        shippingAddressId: selectedAddressId,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Could not create order')
    return data as {
      order: { id: string; orderNumber: string; total: number }
      razorpayOrderId?: string
      gateway: string
    }
  }

  /**
   * Single entry point for the CTA. COD books the order straight away; every
   * other channel books a PENDING order and hands off to the Razorpay modal,
   * pinned to the block the shopper picked.
   */
  const placeOrder = async () => {
    if (!channel) return setError('Please choose a payment method')
    if (!selectedAddressId) return setError('Please select or add a shipping address')

    setError(null)
    setPlacing(true)

    try {
      if (channel === 'cod') {
        const data = await createOrder('cod', channel)
        // Persistent confirmation route — survives refresh/back, unlike the old
        // inline success state.
        router.replace(`/checkout/confirmation/${data.order.id}`)
        return
      }

      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!key) throw new Error('Online payment is not configured. Please use Cash on Delivery.')

      const data = await createOrder('razorpay', channel)
      if (!data.razorpayOrderId) throw new Error('Online payment is unavailable right now.')

      const opened = await openRazorpayCheckout({
        key,
        razorpayOrderId: data.razorpayOrderId,
        amount: data.order.total,
        description: `Order ${data.order.orderNumber}`,
        channel,
        prefill: {
          name: session?.user?.name || '',
          email: session?.user?.email || '',
          contact: selectedAddress?.phone || '',
          vpa: channel === 'upi' && isValidUpiId(upiId) ? upiId.trim() : undefined,
        },
        onSuccess: async (resp: RazorpaySuccess) => {
          try {
            const cRes = await fetchApi('/api/payments/confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.order.id, ...resp }),
            })
            if (!cRes.ok) {
              const cd = await cRes.json().catch(() => ({}))
              throw new Error(cd.error || 'Payment verification failed')
            }
            router.replace(`/checkout/confirmation/${data.order.id}`)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Payment verification failed')
            setPlacing(false)
          }
        },
        // The modal stays open after a decline so the shopper can retry; surface
        // the reason and let ondismiss clear the busy state if they give up.
        onFailure: (message) => setError(message),
        onDismiss: () => setPlacing(false),
      })
      if (!opened) throw new Error('Could not open the payment window. Please try again.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed')
      setPlacing(false)
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────
  if (isLoaded && !isSignedIn) {
    return (
      <Shell>
        <div className="text-center py-20">
          <p className="text-gray-600">Please sign in to check out.</p>
          <Link href="/sign-in" className="btn-primary mt-4 inline-block">Sign In</Link>
        </div>
      </Shell>
    )
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex justify-center py-20 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Shell>
    )
  }

  if (items.length === 0) {
    return (
      <Shell>
        <div className="text-center py-20">
          <p className="text-gray-600">Your cart is empty.</p>
          <Link href="/products" className="btn-primary mt-4 inline-block">Shop sarees</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Checkout</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: address + payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping address */}
          <section className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-gray-700" />
              <h2 className="font-semibold text-gray-900">Shipping address</h2>
            </div>

            {addresses.length > 0 && !showAddressForm && (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-3 cursor-pointer',
                      selectedAddressId === a.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
                    )}
                  >
                    <input
                      type="radio"
                      name="address"
                      className="mt-1"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                    />
                    <span className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">{a.name}</span> · {a.phone}
                      <br />
                      {a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.city}, {a.state} {a.pincode}
                    </span>
                  </label>
                ))}
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 mt-1"
                >
                  <Plus size={16} /> Add a new address
                </button>
              </div>
            )}

            {showAddressForm && (
              <form onSubmit={saveAddress} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input className="input" placeholder="Phone (10 digits)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                <input className="input sm:col-span-2" placeholder="Address line 1" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} required />
                <input className="input sm:col-span-2" placeholder="Address line 2 (optional)" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} />
                <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                <input className="input" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
                <input className="input" placeholder="Pincode (6 digits)" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} required />
                <div className="sm:col-span-2 flex gap-2">
                  <button type="submit" disabled={savingAddress} className="btn-primary disabled:opacity-60">
                    {savingAddress ? 'Saving…' : 'Save address'}
                  </button>
                  {addresses.length > 0 && (
                    <button type="button" onClick={() => setShowAddressForm(false)} className="btn-secondary">Cancel</button>
                  )}
                </div>
              </form>
            )}
          </section>

          {/* Payment */}
          <section className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-gray-700" />
              <h2 className="font-semibold text-gray-900">Payment</h2>
            </div>
            {channels.length === 0 ? (
              <p className="text-sm text-amber-700">
                No payment method is available for the items in your cart. Please remove the
                unavailable items or contact us to complete this order.
              </p>
            ) : (
              <>
                <PaymentMethods
                  selected={channel}
                  onSelect={setChannel}
                  allowCod={allowCod}
                  allowOnline={allowOnline}
                  onlineConfigured={onlineConfigured}
                  codEnabled={codEnabled}
                  upiId={upiId}
                  onUpiIdChange={setUpiId}
                  busy={placing}
                />

                <button
                  onClick={placeOrder}
                  disabled={!channel || placing || !selectedAddressId}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-full bg-gray-900 text-white py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {placing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {channel === 'cod'
                    ? `Place order · ${formatPrice(total)}`
                    : `Pay ${formatPrice(total)}`}
                </button>

                {!selectedAddressId && (
                  <p className="mt-2 text-xs text-amber-700">
                    Select or add a shipping address to continue.
                  </p>
                )}

                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                  <ShieldCheck size={14} className="text-gray-400" />
                  Secure payments · card details never touch our servers
                </p>
              </>
            )}
          </section>
        </div>

        {/* Right: order summary */}
        <aside className="card p-5 h-fit">
          <h2 className="font-semibold text-gray-900 mb-4">Order summary</h2>
          <ul className="space-y-3 mb-4">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate pr-2">{i.product.name} × {i.quantity}</span>
                <span className="text-gray-900 whitespace-nowrap">{formatPrice(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
            <div className="flex justify-between font-semibold text-gray-900 text-base pt-1"><span>Total</span><span>{formatPrice(total)}</span></div>
            {channel && (
              <div className="flex justify-between text-gray-500 pt-1 border-t border-gray-100 mt-2">
                <span>Paying via</span>
                <span>{channels.find((c) => c.id === channel)?.label}</span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <Footer />
    </div>
  )
}
