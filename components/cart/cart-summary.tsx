'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'

interface CartSummaryProps {
  subtotal: number
  itemCount: number
  isLoading?: boolean
}

export function CartSummary({ subtotal, itemCount, isLoading }: CartSummaryProps) {
  const shipping = subtotal > 2999 ? 0 : 99
  const tax = Math.round(subtotal * 0.18) // 18% GST
  const total = subtotal + shipping + tax

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="h-12 bg-gray-200 rounded mt-6"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Order Summary
      </h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">
            Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
          <span className="font-medium">₹{subtotal.toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Shipping</span>
          <span className="font-medium">
            {shipping === 0 ? (
              <span className="text-green-600">FREE</span>
            ) : (
              `₹${shipping}`
            )}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Tax (GST 18%)</span>
          <span className="font-medium">₹{tax.toLocaleString()}</span>
        </div>

        <div className="border-t pt-3">
          <div className="flex justify-between">
            <span className="text-base font-semibold">Total</span>
            <span className="text-base font-semibold">₹{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {subtotal < 2999 && (
        <p className="text-sm text-gray-600 mt-4 p-3 bg-blue-50 rounded-lg">
          Add ₹{(2999 - subtotal).toLocaleString()} more for FREE shipping!
        </p>
      )}

      <div className="mt-6 space-y-3">
        <Link
          href="/checkout"
          className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
        >
          <ShoppingBag size={20} />
          Proceed to Checkout
        </Link>

        <Link
          href="/products"
          className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center block"
        >
          Continue Shopping
        </Link>
      </div>

      <div className="mt-6 flex items-center justify-center space-x-6 text-xs text-gray-500">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
          Secure Checkout
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
          Easy Returns
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
          Cash on Delivery
        </div>
      </div>
    </div>
  )
}