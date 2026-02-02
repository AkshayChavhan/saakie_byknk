'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Tag, Star } from 'lucide-react'
import { PromotionalCard } from './promotional-card'
import { PromotionalCardSkeleton } from './promotional-card-skeleton'
import { API_BASE_URL } from '@/lib/api'

interface PromotionalData {
  bestSellers: {
    count: number
    products: Array<{
      name: string
      slug: string
      price: number
      totalSales: number
    }>
  }
  saleProducts: {
    count: number
    maxDiscount: number
    products: Array<{
      name: string
      slug: string
      price: number
      comparePrice: number
      discount: number
    }>
  }
  featuredProducts: {
    count: number
    products: Array<{
      name: string
      slug: string
      category: string
    }>
  }
}

export function PromotionalBanner() {
  const [data, setData] = useState<PromotionalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPromotionalData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/promotional-data`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error('Failed to fetch promotional data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPromotionalData()
  }, [])

  if (loading) {
    return (
      <section className="py-8 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <PromotionalCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!data) return null

  return (
    <section className="py-8 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Best Sellers */}
          <PromotionalCard
            title="Best Sellers"
            icon={TrendingUp}
            mainStat={data.bestSellers.count}
            subtitle="Top selling products"
            href="/products?sort=bestselling"
            gradientFrom="from-green-500"
            gradientTo="to-green-600"
            textColorLight="text-green-100"
            textColorExtraLight="text-green-200"
            details={
              data.bestSellers.products.length > 0
                ? {
                    label: "Most popular:",
                    value: data.bestSellers.products[0].name,
                    extra: `${data.bestSellers.products[0].totalSales} sold`,
                  }
                : undefined
            }
          />

          {/* Sale Products */}
          <PromotionalCard
            title="Sale Products"
            icon={Tag}
            mainStat={
              data.saleProducts.maxDiscount > 0 
                ? `${data.saleProducts.maxDiscount}%` 
                : data.saleProducts.count
            }
            subtitle={
              data.saleProducts.maxDiscount > 0 
                ? 'Maximum discount' 
                : 'Products on sale'
            }
            href="/products?sale=true"
            gradientFrom="from-red-500"
            gradientTo="to-red-600"
            textColorLight="text-red-100"
            textColorExtraLight="text-red-200"
            details={
              data.saleProducts.products.length > 0
                ? {
                    label: "Featured deal:",
                    value: data.saleProducts.products[0].name,
                    extra: `${data.saleProducts.products[0].discount}% off`,
                  }
                : undefined
            }
          />

          {/* Featured Products */}
          <PromotionalCard
            title="Featured Products"
            icon={Star}
            mainStat={data.featuredProducts.count}
            subtitle="Curated collection"
            href="/products?featured=true"
            gradientFrom="from-purple-500"
            gradientTo="to-purple-600"
            textColorLight="text-purple-100"
            textColorExtraLight="text-purple-200"
            details={
              data.featuredProducts.products.length > 0
                ? {
                    label: "Latest addition:",
                    value: data.featuredProducts.products[0].name,
                    extra: data.featuredProducts.products[0].category,
                  }
                : undefined
            }
          />
        </div>
      </div>
    </section>
  )
}