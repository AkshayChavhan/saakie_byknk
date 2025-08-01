'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import { CartItem } from './cart-item'
import { CartSummary } from './cart-summary'
import { Cart as CartType } from '@/lib/cart'

interface CartProps {
  initialCart?: CartType | null
}

export function Cart({ initialCart }: CartProps) {
  const [cart, setCart] = useState<CartType | null>(initialCart || null)
  const [isLoading, setIsLoading] = useState(!initialCart)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!initialCart) {
      fetchCart()
    }
  }, [initialCart])

  const fetchCart = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/cart')
      if (response.ok) {
        const cartData = await response.json()
        setCart(cartData)
      } else if (response.status === 401) {
        router.push('/sign-in')
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateItemQuantity = async (itemId: string, quantity: number) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      })

      if (response.ok) {
        const updatedCart = await response.json()
        setCart(updatedCart)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update item quantity')
      }
    } catch (error) {
      console.error('Failed to update quantity:', error)
      alert('Failed to update item quantity')
    } finally {
      setIsUpdating(false)
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const updatedCart = await response.json()
        setCart(updatedCart)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove item')
      }
    } catch (error) {
      console.error('Failed to remove item:', error)
      alert('Failed to remove item')
    } finally {
      setIsUpdating(false)
    }
  }

  const clearCart = async () => {
    if (!window.confirm('Are you sure you want to clear your entire cart?')) {
      return
    }

    try {
      setIsUpdating(true)
      const response = await fetch('/api/cart', {
        method: 'DELETE',
      })

      if (response.ok) {
        setCart({ ...cart!, items: [], subtotal: 0, itemCount: 0 })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to clear cart')
      }
    } catch (error) {
      console.error('Failed to clear cart:', error)
      alert('Failed to clear cart')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 mx-auto mb-6 text-gray-300">
            <ShoppingCart size={96} />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Your cart is empty
          </h2>
          <p className="text-gray-600 mb-8">
            Add some beautiful sarees to your cart to get started.
          </p>
          <button
            onClick={() => router.push('/products')}
            className="bg-red-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Start Shopping
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Shopping Cart ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})
          </h1>
          
          {cart.items.length > 0 && (
            <button
              onClick={clearCart}
              disabled={isUpdating}
              className="text-sm text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Cart
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              {cart.items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={updateItemQuantity}
                  onRemoveItem={removeItem}
                  isUpdating={isUpdating}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <CartSummary
                subtotal={cart.subtotal}
                itemCount={cart.itemCount}
                isLoading={isUpdating}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}