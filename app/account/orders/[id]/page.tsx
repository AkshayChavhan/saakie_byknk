'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { User, Package } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SareeLoader } from '@/components/ui/saree-loader'
import { OrderDetailView, type OrderDetail } from '@/components/orders/order-detail-view'
import { orderApi } from '@/lib/api'

export default function OrderDetailPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : ''
  const { status } = useSession()
  const isLoaded = status !== 'loading'
  const isSignedIn = status === 'authenticated'

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await orderApi.getById(id)
      setOrder(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this order')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (isSignedIn && id) loadOrder()
  }, [isSignedIn, id, loadOrder])

  // Signed-out gate (mirrors the account page).
  if (isLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <User className="h-12 w-12 text-gray-300" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Please sign in</h1>
          <p className="mt-2 text-sm text-gray-500">Sign in to view your order.</p>
          <Link href="/sign-in" className="btn-primary mt-6">Sign In</Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading || !isLoaded ? (
          <div className="flex items-center justify-center py-24">
            <SareeLoader size="lg" text="Loading your order..." />
          </div>
        ) : error || !order ? (
          <div className="max-w-md mx-auto text-center py-24">
            <Package className="h-12 w-12 text-gray-300 mx-auto" />
            <h1 className="mt-4 text-xl font-semibold text-gray-900">Order not found</h1>
            <p className="mt-2 text-sm text-gray-500">
              {error || "We couldn't find this order on your account."}
            </p>
            <Link href="/account" className="btn-primary mt-6">Back to my account</Link>
          </div>
        ) : (
          <OrderDetailView order={order} />
        )}
      </main>
      <Footer />
    </div>
  )
}
