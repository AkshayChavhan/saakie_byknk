'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Package, Save, ShieldAlert, User as UserIcon } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { SareeLoader } from '@/components/ui/saree-loader'
import { useToast } from '@/components/ui/toast'
import { OrderDetailView, type OrderDetail } from '@/components/orders/order-detail-view'
import { fetchApi } from '@/lib/api'

/** GET /api/admin/orders/[id] — the customer view plus who placed it. */
interface AdminOrder extends OrderDetail {
  user: {
    id: string
    name: string | null
    email: string
    phone: string | null
    imageUrl: string | null
  } | null
  notes?: string | null
}

const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED',
] as const

const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'] as const

const labelOf = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

export default function AdminOrderDetailPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
  const { data: session, status: authStatus } = useSession()
  const role = session?.user?.role
  const authorized = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const toast = useToast()

  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fulfilment form. Seeded from the order once it loads; saved as one PATCH.
  const [orderStatus, setOrderStatus] = useState<string>('PENDING')
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const seedForm = useCallback((data: AdminOrder) => {
    setOrderStatus(data.status)
    setPaymentStatus(data.paymentStatus)
    setTrackingNumber(data.trackingNumber ?? '')
    setNotes(data.notes ?? '')
  }, [])

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchApi(`/api/admin/orders/${id}`)
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Order not found' : `Could not load this order (${response.status})`)
      }
      const data: AdminOrder = await response.json()
      setOrder(data)
      seedForm(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this order')
    } finally {
      setLoading(false)
    }
  }, [id, seedForm])

  useEffect(() => {
    if (authStatus === 'loading') return
    if (authorized && id) {
      loadOrder()
    } else {
      setLoading(false)
    }
  }, [authStatus, authorized, id, loadOrder])

  const dirty =
    !!order &&
    (orderStatus !== order.status ||
      paymentStatus !== order.paymentStatus ||
      trackingNumber.trim() !== (order.trackingNumber ?? '') ||
      notes.trim() !== (order.notes ?? ''))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order || !dirty) return
    try {
      setSaving(true)
      const response = await fetchApi(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: orderStatus,
          paymentStatus,
          trackingNumber: trackingNumber.trim(),
          notes: notes.trim(),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not save the order')
      setOrder(data)
      seedForm(data)
      toast.success('Order updated', `#${data.orderNumber} is now ${labelOf(data.status)}.`)
    } catch (err) {
      toast.error("Couldn't save", err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <SareeLoader size="lg" text="Loading order..." />
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <ShieldAlert className="h-12 w-12 text-gray-300 mx-auto" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Admin access required</h1>
          <p className="mt-2 text-sm text-gray-500">
            {authStatus === 'authenticated'
              ? 'Your account does not have permission to view orders.'
              : 'Sign in with an admin account to view orders.'}
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex">Back to store</Link>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Package className="h-12 w-12 text-gray-300 mx-auto" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Order not found</h1>
          <p className="mt-2 text-sm text-gray-500">{error || 'This order does not exist.'}</p>
          <Link href="/admin/orders" className="btn-primary mt-6 inline-flex">Back to orders</Link>
        </div>
      </div>
    )
  }

  const customer = order.user

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 sm:mb-8">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Orders</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Order #{order.orderNumber}</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Items, totals and the delivery address on the left; customer and fulfilment on the right.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Customer-facing view, exactly what the shopper sees */}
          <div className="lg:col-span-2">
            <OrderDetailView order={order} showActions={false} />
          </div>

          <div className="space-y-6">
            {/* Customer */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Customer</h2>
              {customer ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <UserIcon className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-900">{customer.name || 'No name'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                    <a href={`mailto:${customer.email}`} className="text-gray-700 hover:text-red-600 break-all">
                      {customer.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="text-gray-700 hover:text-red-600">
                        {customer.phone}
                      </a>
                    ) : (
                      <span className="text-gray-400">No phone on account</span>
                    )}
                  </div>
                  {order.shippingAddress?.phone && order.shippingAddress.phone !== customer.phone && (
                    <p className="text-xs text-gray-500 pt-1">
                      Delivery contact: {order.shippingAddress.name}, {order.shippingAddress.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">The customer account for this order no longer exists.</p>
              )}
            </div>

            {/* Fulfilment */}
            <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Fulfilment</h2>

              <label className="block">
                <span className="block text-xs font-medium text-gray-600 mb-1">Order status</span>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{labelOf(s)}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-gray-600 mb-1">Payment status</span>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{labelOf(s)}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-gray-600 mb-1">Tracking number</span>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Courier tracking id"
                  maxLength={120}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <span className="block text-xs text-gray-400 mt-1">Shown to the customer on their order page.</span>
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-gray-600 mb-1">Internal notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Anything the team should know about this order"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-y"
                />
                <span className="block text-xs text-gray-400 mt-1">Admin only. Never shown to the customer.</span>
              </label>

              <button
                type="submit"
                disabled={!dirty || saving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {dirty ? 'Save changes' : 'No changes'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
