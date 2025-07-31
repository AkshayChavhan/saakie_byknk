'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useUser } from '@clerk/nextjs'

export function CartIcon() {
  const [itemCount, setItemCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (isLoaded && user) {
      fetchCartCount()
    } else if (isLoaded && !user) {
      setItemCount(0)
      setIsLoading(false)
    }
  }, [user, isLoaded])

  const fetchCartCount = async () => {
    try {
      const response = await fetch('/api/cart')
      if (response.ok) {
        const cart = await response.json()
        setItemCount(cart.itemCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch cart count:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isLoaded || !user) {
    return (
      <Link href="/sign-in" className="p-2 rounded-md text-gray-700 hover:bg-gray-100">
        <ShoppingCart size={20} />
      </Link>
    )
  }

  return (
    <Link href="/cart" className="p-2 rounded-md text-gray-700 hover:bg-gray-100 relative">
      <ShoppingCart size={20} />
      {!isLoading && itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  )
}