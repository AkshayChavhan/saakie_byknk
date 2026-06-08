'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import {
  User,
  Package,
  Heart,
  LogOut,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { formatPrice, formatDate, cn } from '@/lib/utils'
import { orderApi } from '@/lib/api'

interface OrderItemSummary {
  id: string
  quantity: number
  product: {
    name: string
    slug: string
    images: { url: string; alt: string | null }[]
  } | null
}

interface OrderSummary {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  createdAt: string
  items: OrderItemSummary[]
}

// Tailwind classes per order status, so each badge reads at a glance.
const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-gray-200 text-gray-700',
  REFUNDED: 'bg-gray-200 text-gray-700',
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function AccountPage() {
  const { data: session, status } = useSession()
  const isLoaded = status !== 'loading'
  const isSignedIn = status === 'authenticated'
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'

  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    try {
      const data = await orderApi.list()
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isSignedIn) {
      fetchOrders()
    } else if (isLoaded) {
      setLoading(false)
    }
  }, [isLoaded, isSignedIn, fetchOrders])

  // Signed out: middleware normally redirects to /sign-in, but guard the UI too.
  if (isLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <User className="h-12 w-12 text-gray-300" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Please sign in</h1>
          <p className="mt-2 text-sm text-gray-500">Sign in to view your account and orders.</p>
          <Link href="/sign-in" className="btn-primary mt-6">Sign In</Link>
        </main>
        <Footer />
      </div>
    )
  }

  const name = session?.user?.name || 'My Account'
  const email = session?.user?.email || ''

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">My Account</h1>

        {/* Profile card — Sign Out lives here, alongside the user details. */}
        <div className="card p-5 mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white">
            <User size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-gray-900 truncate">{name}</p>
            {email && <p className="text-sm text-gray-500 truncate">{email}</p>}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="shrink-0 flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <Link href="/wishlist" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <Heart className="h-5 w-5 text-rose-500" />
            <span className="flex-1 text-sm font-medium text-gray-900">My Wishlist</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
          <Link href="/products" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <ShoppingBag className="h-5 w-5 text-gray-700" />
            <span className="flex-1 text-sm font-medium text-gray-900">Continue Shopping</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
          {isAdmin && (
            <Link href="/admin" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <ShieldCheck className="h-5 w-5 text-gray-700" />
              <span className="flex-1 text-sm font-medium text-gray-900">Admin Dashboard</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Link>
          )}
        </div>

        {/* Orders */}
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">My Orders</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-8 text-center">
            <Package className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="mt-3 text-sm text-gray-600">You haven&apos;t placed any orders yet.</p>
            <Link href="/products" className="btn-primary mt-5 inline-block">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const firstImage = order.items?.[0]?.product?.images?.[0]?.url
              return (
                <div key={order.id} className="card p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.createdAt)}</p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-3 py-1 text-xs font-medium',
                        STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    {firstImage && (
                      <Image
                        src={firstImage}
                        alt={order.items[0]?.product?.name || 'Product'}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-md object-cover bg-gray-100"
                      />
                    )}
                    <p className="flex-1 text-sm text-gray-600 truncate">
                      {order.items?.[0]?.product?.name}
                      {order.items?.length > 1 && ` + ${order.items.length - 1} more`}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">{formatPrice(order.total)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
