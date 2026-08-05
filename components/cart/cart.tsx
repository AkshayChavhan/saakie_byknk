'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { CartItem } from './cart-item'
import { CartSummary } from './cart-summary'
import { DeliveryAddress } from './delivery-address'
import { SareeLoader } from '@/components/ui/saree-loader'
import { useToast } from '@/components/ui/toast'
import { cartApi } from '@/lib/api'

interface CartItemType {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    slug: string
    price: number
    stock: number
    images: Array<{
      url: string
      alt?: string
      isPrimary: boolean
    }>
  }
}

interface CartType {
  id: string
  items: CartItemType[]
  subtotal: number
  itemCount: number
}

interface CartProps {
  initialCart?: CartType | null
}

export function Cart({ initialCart }: CartProps) {
  const [cart, setCart] = useState<CartType | null>(initialCart || null)
  const [isLoading, setIsLoading] = useState(!initialCart)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()
  const { status } = useSession()
  const toast = useToast()
  const isLoaded = status !== 'loading'

  const fetchCart = useCallback(async () => {
    try {
      setIsLoading(true)
      const cartData = await cartApi.get()
      setCart(cartData)
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialCart && isLoaded) {
      if (status === 'authenticated') {
        fetchCart()
      } else {
        router.push('/sign-in')
      }
    }
  }, [initialCart, isLoaded, status, fetchCart, router])

  const updateItemQuantity = async (itemId: string, quantity: number) => {
    try {
      setIsUpdating(true)
      const updatedCart = await cartApi.updateItem(itemId, quantity)
      setCart(updatedCart)
    } catch (error) {
      console.error('Failed to update quantity:', error)
      toast.error("Couldn't update quantity", 'Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      setIsUpdating(true)
      const updatedCart = await cartApi.removeItem(itemId)
      setCart(updatedCart)
    } catch (error) {
      console.error('Failed to remove item:', error)
      toast.error("Couldn't remove the item", 'Please try again.')
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
      await cartApi.clear()
      setCart({ ...cart!, items: [], subtotal: 0, itemCount: 0 })
    } catch (error) {
      console.error('Failed to clear cart:', error)
      toast.error("Couldn't clear your cart", 'Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading || !isLoaded) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <SareeLoader size="lg" text="Loading your cart..." />
        </div>
      </div>
    )
  }

  if (!cart || !cart.items || cart.items.length === 0) {
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
        <div className="flex items-center justify-between gap-3 mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Shopping Cart ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})
          </h1>

          {cart.items.length > 0 && (
            // Outlined pill rather than bare text: this empties the whole cart,
            // so it needs to read as a control you are about to press. Matches
            // the Sign Out button on the account page.
            <button
              onClick={clearCart}
              disabled={isUpdating}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:border-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Clear Cart</span>
              <span className="sr-only sm:hidden">Clear Cart</span>
            </button>
          )}
        </div>

        {/* Where this order is going, above the items — the same question a
            customer asks before deciding to check out, not after. */}
        <DeliveryAddress />

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
