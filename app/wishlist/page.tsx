'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@clerk/nextjs'
import { Heart, ShoppingCart, Trash2, ArrowRight, Package } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { formatPrice } from '@/lib/utils'
import { wishlistApi, cartApi } from '@/lib/api'

interface WishlistItem {
  id: string
  product: {
    id: string
    name: string
    slug: string
    price: number
    comparePrice: number | null
    images: {
      url: string
      alt: string | null
    }[]
    category: {
      name: string
      slug: string
    }
    stock: number
  }
}

export default function WishlistPage() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  const fetchWishlist = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) {
        setLoading(false)
        return
      }
      const data = await wishlistApi.get(token)
      setWishlistItems(data.items || [])
    } catch (error) {
      console.error('Error fetching wishlist:', error)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchWishlist()
    } else if (isLoaded) {
      setLoading(false)
    }
  }, [isLoaded, isSignedIn, fetchWishlist])

  const removeFromWishlist = async (productId: string) => {
    setRemoving(productId)
    try {
      const token = await getToken()
      if (!token) return
      await wishlistApi.removeItem(token, productId)
      setWishlistItems(prev => prev.filter(item => item.product.id !== productId))
    } catch (error) {
      console.error('Error removing from wishlist:', error)
    } finally {
      setRemoving(null)
    }
  }

  const addToCart = async (productId: string) => {
    setAddingToCart(productId)
    try {
      const token = await getToken()
      if (!token) return
      await cartApi.addItem(token, { productId, quantity: 1 })
      alert('Added to cart!')
    } catch (error) {
      console.error('Error adding to cart:', error)
    } finally {
      setAddingToCart(null)
    }
  }

  // Not signed in state
  if (isLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-rose-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Sign in to view your Wishlist
            </h1>
            <p className="text-gray-600 mb-8">
              Create an account or sign in to save your favorite items and access them from any device.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center px-6 py-3 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 font-medium rounded-full border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">My Wishlist</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-gray-200 rounded-2xl mb-4" />
                <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Empty wishlist state
  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-gray-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Your Wishlist is Empty
            </h1>
            <p className="text-gray-600 mb-8">
              Start adding items you love to your wishlist. Click the heart icon on any product to save it here.
            </p>
            <Link
              href="/products"
              className="group inline-flex items-center justify-center px-6 py-3 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-colors"
            >
              Explore Products
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Wishlist with items
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Wishlist</h1>
            <p className="text-gray-600 mt-1">{wishlistItems.length} items saved</p>
          </div>
          <Link
            href="/products"
            className="text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
          >
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Wishlist Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlistItems.map((item, index) => {
            const product = item.product
            const primaryImage = product.images[0]
            const isOutOfStock = product.stock === 0
            const hasDiscount = product.comparePrice && product.comparePrice > product.price
            const discountPercent = hasDiscount
              ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
              : 0

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 animate-slide-up group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Image */}
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Link href={`/products/${product.slug}`}>
                    {primaryImage ? (
                      <Image
                        src={primaryImage.url}
                        alt={primaryImage.alt || product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </Link>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {hasDiscount && (
                      <span className="px-2 py-1 bg-rose-600 text-white text-xs font-medium rounded-full">
                        -{discountPercent}%
                      </span>
                    )}
                    {isOutOfStock && (
                      <span className="px-2 py-1 bg-gray-900 text-white text-xs font-medium rounded-full">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    disabled={removing === product.id}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-rose-50 transition-colors disabled:opacity-50"
                    aria-label="Remove from wishlist"
                  >
                    {removing === product.id ? (
                      <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5 text-rose-600" />
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  <Link href={`/categories/${product.category.slug}`}>
                    <span className="text-xs text-gray-500 hover:text-rose-600 transition-colors">
                      {product.category.name}
                    </span>
                  </Link>
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="font-medium text-gray-900 mt-1 line-clamp-2 hover:text-rose-600 transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Price */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-gray-500 line-through">
                        {formatPrice(product.comparePrice!)}
                      </span>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => addToCart(product.id)}
                    disabled={isOutOfStock || addingToCart === product.id}
                    className={`w-full mt-4 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      isOutOfStock
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98]'
                    }`}
                  >
                    {addingToCart === product.id ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : isOutOfStock ? (
                      'Out of Stock'
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        Add to Cart
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Footer />
    </div>
  )
}
