'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Folder, Sparkles } from 'lucide-react'
import { SareeLoader } from '@/components/ui/saree-loader'
import { fetchApi } from '@/lib/api'

interface Category {
  id: string
  name: string
  slug: string
  image: string
  count: number
}

export function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetchApi('/api/categories')
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }
      const data = await response.json()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-gray-50 to-white" aria-labelledby="categories-heading">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-12">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-secondary-500" aria-hidden="true" />
              <span className="text-sm font-medium text-secondary-600 tracking-wide uppercase">
                Curated Collections
              </span>
            </div>
            <h2
              id="categories-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3"
            >
              Shop by Category
            </h2>
            <p className="text-gray-600 max-w-2xl">
              Browse through our handpicked collection of traditional and contemporary sarees
            </p>
          </div>

          {/* View All Categories Link - Enhanced */}
          <Link
            href="/categories"
            className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 self-center sm:self-auto"
            aria-label="View all categories"
          >
            <span>View All Categories</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16" role="status" aria-label="Loading categories">
            <SareeLoader size="md" text="Loading categories..." />
          </div>
        ) : error ? (
          <div className="text-center py-12" role="alert" aria-live="polite">
            <div className="bg-white rounded-xl shadow-sm p-8 max-w-md mx-auto border border-gray-100">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
                <Folder className="h-6 w-6 text-primary-400" aria-hidden="true" />
              </div>
              <p className="text-gray-500 mb-4">Failed to load categories</p>
              <button
                onClick={fetchCategories}
                className="inline-flex items-center justify-center gap-2 bg-primary-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12" role="status" aria-live="polite">
            <div className="bg-white rounded-xl shadow-sm p-8 max-w-md mx-auto border border-gray-100">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Folder className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <p className="text-gray-500">No categories available</p>
            </div>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
            role="list"
            aria-label="Product categories"
          >
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
                role="listitem"
                aria-label={`${category.name} - ${category.count} products`}
              >
                <div className="aspect-[3/4] relative bg-gray-200">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
                      <Folder className="h-16 w-16 text-primary-200" aria-hidden="true" />
                    </div>
                  )}

                  {/* Gradient overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 z-[5]" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-20">
                    <h3 className="text-white font-semibold text-base sm:text-lg lg:text-xl mb-1 group-hover:text-secondary-200 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-white/80 text-xs sm:text-sm">
                      {category.count} Products
                    </p>

                    {/* Hover indicator */}
                    <div className="flex items-center gap-1.5 mt-2 sm:mt-3 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <span className="text-white/90 text-xs sm:text-sm font-medium">Explore</span>
                      <ArrowRight size={14} className="text-white/90 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Mobile View All Link */}
        {!loading && !error && categories.length > 0 && (
          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/categories"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 active:scale-[0.98]"
            >
              <span>View All Categories</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}