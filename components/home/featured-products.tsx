'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const products = [
  {
    id: 1,
    name: 'Pure Silk Kanjivaram Saree',
    price: 12999,
    comparePrice: 18999,
    rating: 4.8,
    reviews: 124,
    image: '/images/product-1.jpg',
    colors: ['#FFD700', '#DC143C', '#4B0082'],
    isNew: true,
  },
  {
    id: 2,
    name: 'Banarasi Georgette Saree',
    price: 8999,
    comparePrice: 12999,
    rating: 4.6,
    reviews: 89,
    image: '/images/product-2.jpg',
    colors: ['#FF69B4', '#00CED1', '#FF6347'],
    isBestseller: true,
  },
  {
    id: 3,
    name: 'Designer Cotton Silk Saree',
    price: 5999,
    comparePrice: 8999,
    rating: 4.7,
    reviews: 156,
    image: '/images/product-3.jpg',
    colors: ['#9370DB', '#20B2AA', '#FF1493'],
  },
  {
    id: 4,
    name: 'Embroidered Chiffon Saree',
    price: 6999,
    comparePrice: 9999,
    rating: 4.5,
    reviews: 67,
    image: '/images/product-4.jpg',
    colors: ['#000080', '#8B0000', '#006400'],
  },
]

export function FeaturedProducts() {
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null)
  const [wishlist, setWishlist] = useState<number[]>([])

  const toggleWishlist = (productId: number) => {
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
      </div>
    </section>
  )
}