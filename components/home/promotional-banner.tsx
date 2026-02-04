'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Tag, Star } from 'lucide-react'
import { PromotionalCard } from './promotional-card'
import { PromotionalCardSkeleton } from './promotional-card-skeleton'
import { fetchApi } from '@/lib/api'

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
        const response = await fetchApi('/api/promotional-data')
        if (response.ok) {
          const result = await response.json()
          // Handle API response - map to expected format or use defaults
          // The API returns {banners: [], offers: []} but we need {bestSellers, saleProducts, featuredProducts}
          if (result.bestSellers && result.saleProducts && result.featuredProducts) {
            setData(result)
          } else {
            // Use default promotional data if API returns different structure
            setData(getDefaultData())
          }
        } else {
          setData(getDefaultData())
        }
      } catch (error) {
        console.error('Failed to fetch promotional data:', error)
        setData(getDefaultData())
      } finally {
        setLoading(false)
      }
    }

    fetchPromotionalData()
  }, [])

  const getDefaultData = (): PromotionalData => ({
    bestSellers: {
      count: 0,
      products: []
    },
    saleProducts: {
      count: 0,
      maxDiscount: 0,
      products: []
    },
    featuredProducts: {
      count: 0,
      products: []
    }
  })

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

  // Safe access with fallbacks
  const bestSellers = data.bestSellers || { count: 0, products: [] }
  const saleProducts = data.saleProducts || { count: 0, maxDiscount: 0, products: [] }
  const featuredProducts = data.featuredProducts || { count: 0, products: [] }

  return (
    <section className="py-8 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Best Sellers */}
          <PromotionalCard
            title="Best Sellers"
            icon={TrendingUp}
            mainStat={bestSellers.count || 0}
            subtitle="Top selling products"
            href="/products?sort=bestselling"
            gradientFrom="from-green-500"
            gradientTo="to-green-600"
            textColorLight="text-green-100"
            textColorExtraLight="text-green-200"
            details={
              bestSellers.products?.length > 0
                ? {
                    label: "Most popular:",
                    value: bestSellers.products[0].name,
                    extra: `${bestSellers.products[0].totalSales || 0} sold`,
                  }
                : undefined
            }
          />

          {/* Sale Products */}
          <PromotionalCard
            title="Sale Products"
            icon={Tag}
            mainStat={
              (saleProducts.maxDiscount || 0) > 0
                ? `${saleProducts.maxDiscount}%`
                : (saleProducts.count || 0)
            }
            subtitle={
              (saleProducts.maxDiscount || 0) > 0
                ? 'Maximum discount'
                : 'Products on sale'
            }
            href="/products?sale=true"
            gradientFrom="from-red-500"
            gradientTo="to-red-600"
            textColorLight="text-red-100"
            textColorExtraLight="text-red-200"
            details={
              saleProducts.products?.length > 0
                ? {
                    label: "Featured deal:",
                    value: saleProducts.products[0].name,
                    extra: `${saleProducts.products[0].discount || 0}% off`,
                  }
                : undefined
            }
          />

          {/* Featured Products */}
          <PromotionalCard
            title="Featured Products"
            icon={Star}
            mainStat={featuredProducts.count || 0}
            subtitle="Curated collection"
            href="/products?featured=true"
            gradientFrom="from-purple-500"
            gradientTo="to-purple-600"
            textColorLight="text-purple-100"
            textColorExtraLight="text-purple-200"
            details={
              featuredProducts.products?.length > 0
                ? {
                    label: "Latest addition:",
                    value: featuredProducts.products[0].name,
                    extra: featuredProducts.products[0].category || '',
                  }
                : undefined
            }
          />
        </div>
      </div>
    </section>
  )
}