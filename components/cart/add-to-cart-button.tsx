'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Check } from 'lucide-react'
import { useUser, useAuth } from '@clerk/nextjs'
import { cartApi } from '@/lib/api'

interface AddToCartButtonProps {
  productId: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary'
  showIcon?: boolean
  children?: React.ReactNode
}

export function AddToCartButton({ 
  productId, 
  className = '', 
  size = 'md',
  variant = 'primary',
  showIcon = true,
  children 
}: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAdded, setIsAdded] = useState(false)
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const router = useRouter()

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  const variantClasses = {
    primary: 'bg-red-600 text-white hover:bg-red-700',
    secondary: 'border border-red-600 text-red-600 hover:bg-red-50'
  }

  const handleAddToCart = async () => {
    if (!isLoaded) return

    if (!user) {
      router.push('/sign-in')
      return
    }

    try {
      setIsLoading(true)
      const token = await getToken()
      if (!token) {
        router.push('/sign-in')
        return
      }

      await cartApi.addItem(token, { productId, quantity: 1 })
      setIsAdded(true)
      // Reset the "added" state after 2 seconds
      setTimeout(() => setIsAdded(false), 2000)

      // Trigger a custom event to update cart count in header
      window.dispatchEvent(new CustomEvent('cartUpdated'))
    } catch (error: any) {
      console.error('Failed to add to cart:', error)
      alert(error.message || 'Failed to add item to cart')
    } finally {
      setIsLoading(false)
    }
  }

  const baseClasses = `
    inline-flex items-center justify-center gap-2 font-medium rounded-lg
    transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size]} ${variantClasses[variant]} ${className}
  `.trim()

  return (
    <button
      onClick={handleAddToCart}
      disabled={isLoading || !isLoaded}
      className={baseClasses}
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Adding...
        </>
      ) : isAdded ? (
        <>
          {showIcon && <Check size={20} />}
          {children || 'Added!'}
        </>
      ) : (
        <>
          {showIcon && <ShoppingCart size={20} />}
          {children || 'Add to Cart'}
        </>
      )}
    </button>
  )
}