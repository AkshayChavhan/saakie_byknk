'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Home, ChevronRight, Grid3X3, LayoutGrid, Folder, ArrowRight, Sparkles } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SareeLoader } from '@/components/ui/saree-loader'
import { fetchApi } from '@/lib/api'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  productCount: number
  isActive: boolean
}

// Skeleton component for loading state
function CategorySkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-[4/5] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  )
}

function CategoriesContent() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetchApi('/api/categories')

      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }

      const data = await response.json()
      // Filter only active categories for public display
      const activeCategories = Array.isArray(data)
        ? data.filter((cat: Category) => cat.isActive !== false)
        : []
      setCategories(activeCategories)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />

      {/* Breadcrumb */}
      <nav
        className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-30"
        aria-label="Breadcrumb"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <ol className="flex items-center text-sm text-gray-600" role="list">
            <li>
              <Link
                href="/"
                className="flex items-center hover:text-primary-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                aria-label="Go to home page"
              >
                <Home size={16} className="mr-1.5" aria-hidden="true" />
                <span>Home</span>
              </Link>
            </li>
            <li className="flex items-center">
              <ChevronRight size={16} className="mx-2 text-gray-400" aria-hidden="true" />
              <span className="text-gray-900 font-medium" aria-current="page">Categories</span>
            </li>
          </ol>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="relative bg-gradient-to-br from-primary-50 via-white to-secondary-50 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-100/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary-100/30 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 relative">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-secondary-500" aria-hidden="true" />
                <span className="text-sm font-medium text-secondary-600 tracking-wide uppercase">
                  Explore Our Collection
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
                Shop by Category
              </h1>
              <p className="text-gray-600 mt-2 sm:mt-3 text-base sm:text-lg max-w-xl">
                Discover our handpicked collection of traditional and contemporary sarees,
                curated just for you.
              </p>
            </div>

            {/* View Toggle */}
            <div
              className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl p-1.5 shadow-sm border border-gray-200/50 self-start sm:self-auto animate-slide-up"
              role="group"
              aria-label="View mode toggle"
            >
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                  viewMode === 'grid'
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <Grid3X3 size={20} aria-hidden="true" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                  viewMode === 'list'
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <LayoutGrid size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Loading State with Skeletons */}
        {loading && (
          <div role="status" aria-label="Loading categories">
            <div className="flex items-center justify-center py-8 mb-8">
              <SareeLoader size="lg" text="Loading categories..." />
            </div>
            <div className={viewMode === 'grid'
              ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
              : "space-y-4"
            }>
              {[...Array(8)].map((_, i) => (
                <CategorySkeleton key={i} viewMode={viewMode} />
              ))}
            </div>
            <span className="sr-only">Loading categories, please wait...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            className="text-center py-16 animate-fade-in"
            role="alert"
            aria-live="polite"
          >
            <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 max-w-md mx-auto border border-gray-100">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary-50 flex items-center justify-center">
                <Folder className="h-8 w-8 text-primary-400" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Unable to load categories
              </h2>
              <p className="text-gray-500 mb-6">
                We encountered an issue while fetching the categories. Please try again.
              </p>
              <button
                onClick={fetchCategories}
                className="inline-flex items-center justify-center gap-2 bg-primary-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-600 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 active:scale-[0.98]"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Categories Display */}
        {!loading && !error && (
          <>
            {categories.length === 0 ? (
              <div
                className="text-center py-16 animate-fade-in"
                role="status"
                aria-live="polite"
              >
                <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 max-w-md mx-auto border border-gray-100">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
                    <Folder className="h-8 w-8 text-primary-400" aria-hidden="true" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    No categories available
                  </h2>
                  <p className="text-gray-500 mb-6">
                    We are currently updating our collection. Check back soon!
                  </p>
                  <Link
                    href="/products"
                    className="inline-flex items-center justify-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg px-4 py-2"
                  >
                    Browse all products
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Results count */}
                <div className="mb-6 sm:mb-8 flex items-center justify-between animate-fade-in">
                  <p className="text-gray-600 text-sm sm:text-base">
                    <span className="font-semibold text-gray-900">{categories.length}</span>
                    {' '}categories available
                  </p>
                </div>

                {/* Categories Grid/List */}
                <div
                  className={viewMode === 'grid'
                    ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
                    : "space-y-4"
                  }
                  role="list"
                  aria-label="Categories"
                >
                  {categories.map((category, index) => (
                    <Link
                      key={category.id}
                      href={`/categories/${category.slug}`}
                      className={`group block animate-slide-up focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-xl ${
                        viewMode === 'grid'
                          ? "bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100/50 hover:border-primary-200"
                          : "bg-white rounded-xl shadow-sm p-4 hover:shadow-xl transition-all duration-300 border border-gray-100/50 hover:border-primary-200"
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                      role="listitem"
                      aria-label={`${category.name} - ${category.productCount || 0} products`}
                    >
                      {viewMode === 'grid' ? (
                        // Grid View
                        <article className="h-full flex flex-col">
                          <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
                            {category.image ? (
                              <Image
                                src={category.image}
                                alt=""
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
                                <Folder className="h-12 w-12 sm:h-16 sm:w-16 text-primary-200" aria-hidden="true" />
                              </div>
                            )}
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            {/* Hover action indicator */}
                            <div className="absolute bottom-4 left-4 right-4 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                              <span className="inline-flex items-center gap-1.5 text-white text-sm font-medium">
                                Explore Collection
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                              </span>
                            </div>
                          </div>
                          <div className="p-4 flex-1 flex flex-col">
                            <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200 text-sm sm:text-base">
                              {category.name}
                            </h3>
                            {category.description && (
                              <p className="text-xs sm:text-sm text-gray-500 mt-1.5 line-clamp-2 flex-1">
                                {category.description}
                              </p>
                            )}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <span className="text-xs font-medium text-secondary-600 bg-secondary-50 px-2.5 py-1 rounded-full">
                                {category.productCount || 0} products
                              </span>
                            </div>
                          </div>
                        </article>
                      ) : (
                        // List View
                        <article className="flex items-center gap-4 sm:gap-6">
                          <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                            {category.image ? (
                              <Image
                                src={category.image}
                                alt=""
                                fill
                                sizes="112px"
                                className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
                                <Folder className="h-8 w-8 text-primary-200" aria-hidden="true" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors duration-200 text-base sm:text-lg">
                              {category.name}
                            </h3>
                            {category.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {category.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-3">
                              <span className="text-xs font-medium text-secondary-600 bg-secondary-50 px-2.5 py-1 rounded-full">
                                {category.productCount || 0} products
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 hidden sm:block">
                            <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-primary-500 flex items-center justify-center transition-all duration-300">
                              <ChevronRight
                                className="h-5 w-5 text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300"
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                        </article>
                      )}
                    </Link>
                  ))}
                </div>

                {/* Browse All Products CTA */}
                <div className="mt-12 sm:mt-16 text-center animate-fade-in">
                  <div className="bg-gradient-to-r from-primary-50 via-white to-secondary-50 rounded-2xl p-8 sm:p-12 border border-gray-100">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                      Can&apos;t find what you&apos;re looking for?
                    </h2>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Browse our complete collection of handcrafted sarees and ethnic wear.
                    </p>
                    <Link
                      href="/products"
                      className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 active:scale-[0.98]"
                    >
                      View All Products
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

// Loading fallback for Suspense
function CategoriesPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <SareeLoader size="lg" text="Loading categories..." />
    </div>
  )
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesPageLoading />}>
      <CategoriesContent />
    </Suspense>
  )
}
