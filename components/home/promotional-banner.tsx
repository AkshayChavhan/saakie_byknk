'use client'

import { TrendingUp, Tag, Star } from 'lucide-react'
import { PromotionalCard } from './promotional-card'
import type { PromotionalStats } from '@/lib/server/storefront'

interface PromotionalBannerProps {
  /** Highlight stats loaded on the server (app/page.tsx); null hides the strip. */
  data: PromotionalStats | null
}

export function PromotionalBanner({ data }: PromotionalBannerProps) {
  if (!data) return null

  // Safe access with fallbacks
  const bestSellers = data.bestSellers || { count: 0, products: [] }
  const saleProducts = data.saleProducts || { count: 0, maxDiscount: 0, products: [] }
  const featuredProducts = data.featuredProducts || { count: 0, products: [] }

  // Only show a card when it has products — hide any card whose count is 0.
  const showBestSellers = (bestSellers.count || 0) > 0
  const showSaleProducts = (saleProducts.count || 0) > 0
  const showFeaturedProducts = (featuredProducts.count || 0) > 0

  const visibleCount =
    Number(showBestSellers) + Number(showSaleProducts) + Number(showFeaturedProducts)

  // If every card is empty, render nothing (no empty section strip).
  if (visibleCount === 0) {
    return null
  }

  // Lay out the grid for however many cards remain so they fill the row
  // evenly instead of leaving a lopsided gap.
  const gridColsByCount: Record<number, string> = {
    1: 'md:grid-cols-1 max-w-md mx-auto',
    2: 'md:grid-cols-2 max-w-3xl mx-auto',
    3: 'md:grid-cols-3',
  }
  const gridCols = gridColsByCount[visibleCount]

  return (
    <section className="py-10 bg-gradient-to-b from-[#fdf8f0] to-white">
      <div className="container mx-auto px-4">
        <div className={`grid grid-cols-1 gap-6 ${gridCols}`}>
          {/* Best Sellers */}
          {showBestSellers && (
            <PromotionalCard
              title="Best Sellers"
              icon={TrendingUp}
              mainStat={bestSellers.count || 0}
              subtitle="Top selling products"
              href="/products?sort=popular"
              gradientFrom="from-emerald-500"
              gradientVia="via-green-600"
              gradientTo="to-teal-700"
              textColorLight="text-emerald-50"
              textColorExtraLight="text-emerald-100/80"
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
          )}

          {/* Sale Products */}
          {showSaleProducts && (
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
              gradientFrom="from-rose-500"
              gradientVia="via-red-600"
              gradientTo="to-maroon-800"
              textColorLight="text-rose-50"
              textColorExtraLight="text-rose-100/80"
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
          )}

          {/* Featured Products */}
          {showFeaturedProducts && (
            <PromotionalCard
              title="Featured Products"
              icon={Star}
              mainStat={featuredProducts.count || 0}
              subtitle="Curated collection"
              href="/products?featured=true"
              gradientFrom="from-violet-500"
              gradientVia="via-purple-600"
              gradientTo="to-fuchsia-700"
              textColorLight="text-violet-50"
              textColorExtraLight="text-violet-100/80"
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
          )}
        </div>
      </div>
    </section>
  )
}