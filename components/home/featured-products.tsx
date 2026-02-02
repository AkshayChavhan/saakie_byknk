'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { SareeLoader } from '@/components/ui/saree-loader'
import { productApi } from '@/lib/api'

interface Product {
  id: string
  name: string
  price: number
  comparePrice: number
  rating: number
  reviews: number
  image: string
  colors: string[]
  isNew?: boolean
  isBestseller?: boolean
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null)
  const [wishlist, setWishlist] = useState<string[]>([])

  useEffect(() => {
    fetchFeaturedProducts()
  }, [])

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true)
      const data = await productApi.getFeatured()
      setProducts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching featured products:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  const discount = (price: number, comparePrice: number) => {
    return Math.round(((comparePrice - price) / comparePrice) * 100)
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 sm:mb-12">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              Featured Products
            </h2>
            <p className="text-gray-600">
              Handpicked sarees for the discerning woman
            </p>
          </div>
          <Link
            href="/products"
            className="mt-4 sm:mt-0 text-primary hover:text-primary/80 font-medium"
          >
            View All Products →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <SareeLoader size="md" text="Loading featured sarees..." />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Failed to load featured products</p>
            <button 
              onClick={fetchFeaturedProducts}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No featured products available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
            <div
              key={product.id}
              className="group relative"
              onMouseEnter={() => setHoveredProduct(product.id)}
              onMouseLeave={() => setHoveredProduct(null)}
            >
              <Link href={`/products/${product.id}`}>
                <div className="relative aspect-[3/4] mb-3 overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.isNew && (
                    <span className="absolute top-2 left-2 z-10 bg-primary text-white text-xs px-2 py-1 rounded">
                      NEW
                    </span>
                  )}
                  {product.isBestseller && (
                    <span className="absolute top-2 left-2 z-10 bg-secondary text-white text-xs px-2 py-1 rounded">
                      BESTSELLER
                    </span>
                  )}
                  <span className="absolute top-2 right-2 z-10 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    {discount(product.price, product.comparePrice)}% OFF
                  </span>
                  
                  <div className={`absolute inset-0 bg-black/20 transition-opacity ${
                    hoveredProduct === product.id ? 'opacity-100' : 'opacity-0'
                  }`} />
                  
                  <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 transition-all ${
                    hoveredProduct === product.id
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  }`}>
                    <button className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors">
                      <ShoppingCart size={18} className="text-gray-700" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900 line-clamp-2 text-sm sm:text-base">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-600 ml-1">
                        {product.rating} ({product.reviews})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(product.comparePrice)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {product.colors.map((color, index) => (
                      <div
                        key={index}
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </Link>

              <button
                onClick={() => toggleWishlist(product.id)}
                className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
                  wishlist.includes(product.id)
                    ? 'bg-red-500 text-white'
                    : 'bg-white/80 text-gray-700 hover:bg-white'
                }`}
              >
                <Heart
                  size={16}
                  className={wishlist.includes(product.id) ? 'fill-current' : ''}
                />
              </button>
            </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}