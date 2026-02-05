'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Search,
  Filter,
  Heart,
  ShoppingCart,
  Star,
  Grid3X3,
  LayoutGrid,
  X,
  Home,
  ChevronRight,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Package
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SareeLoader } from '@/components/ui/saree-loader'
import { fetchApi } from '@/lib/api'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number
  rating: number
  reviews: number
  image: string
  colors: string[]
  category: {
    name: string
    slug: string
  }
  stock: number
  isNew?: boolean
  isBestseller?: boolean
  inStock: boolean
}

interface Category {
  id: string
  name: string
  slug: string
}

interface ApiResponse {
  products: Product[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

function ProductsContent() {
  const searchParams = useSearchParams()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states - initialize from URL params
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [initialized, setInitialized] = useState(false)

  // UI states
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [wishlist, setWishlist] = useState<string[]>([])
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  // Initialize filters from URL params
  useEffect(() => {
    const sort = searchParams.get('sort')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const min = searchParams.get('minPrice')
    const max = searchParams.get('maxPrice')
    const page = searchParams.get('page')
    const sale = searchParams.get('sale')

    if (sort) setSortBy(sort)
    if (category) setSelectedCategory(category)
    if (search) setSearchQuery(search)
    if (min) setMinPrice(min)
    if (max) setMaxPrice(max)
    if (page) setCurrentPage(parseInt(page))
    if (sale === 'true') {
      // Products with comparePrice are on sale - handled in API
    }

    setInitialized(true)
  }, [searchParams])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetchApi('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        sort: sortBy
      })

      if (searchQuery) params.append('search', searchQuery)
      if (selectedCategory) params.append('category', selectedCategory)
      if (minPrice) params.append('minPrice', minPrice)
      if (maxPrice) params.append('maxPrice', maxPrice)

      const response = await fetchApi(`/api/products?${params}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`)
      }

      const data: ApiResponse = await response.json()
      setProducts(data.products)
      setPagination(data.pagination)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, sortBy, searchQuery, selectedCategory, minPrice, maxPrice])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    if (initialized) {
      fetchProducts()
    }
  }, [fetchProducts, initialized])

  const toggleWishlist = (productId: string) => {
    setWishlist(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const discount = (price: number, comparePrice: number) => {
    return Math.round(((comparePrice - price) / comparePrice) * 100)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSortBy('newest')
    setMinPrice('')
    setMaxPrice('')
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const sortOptions = [
    { value: 'newest', label: 'Newest First', icon: Sparkles },
    { value: 'popular', label: 'Most Popular', icon: TrendingUp },
    { value: 'price-low', label: 'Price: Low to High', icon: ChevronDown },
    { value: 'price-high', label: 'Price: High to Low', icon: ChevronDown },
    { value: 'name', label: 'Name A-Z', icon: Package },
    { value: 'rating', label: 'Highest Rated', icon: Star },
  ]

  const activeFiltersCount = [
    selectedCategory,
    minPrice,
    maxPrice,
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 text-white">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <nav className="flex items-center text-sm text-rose-100 mb-2">
                <Link href="/" className="flex items-center hover:text-white transition-colors">
                  <Home size={14} className="mr-1" />
                  Home
                </Link>
                <ChevronRight size={14} className="mx-2" />
                <span className="text-white font-medium">Products</span>
              </nav>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                Our Collection
              </h1>
              <p className="text-rose-100 mt-1 text-sm sm:text-base">
                Discover exquisite sarees for every occasion
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                {pagination.totalCount} Products
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="bg-white/95 backdrop-blur-md shadow-sm sticky top-16 z-40 border-b border-gray-100">
        <div className="container mx-auto px-4">
          {/* Search Bar */}
          <div className="py-4">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search for sarees, patterns, colors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-full focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all text-sm sm:text-base"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between gap-3 py-3 border-t border-gray-100">
            {/* Left Side - Filter Button & Categories */}
            <div className="flex items-center gap-2 flex-1 overflow-hidden">
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-all flex-shrink-0"
              >
                <SlidersHorizontal size={16} />
                <span className="hidden sm:inline">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-rose-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Category Pills - Scrollable */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all flex-shrink-0 ${
                    !selectedCategory
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {categories.slice(0, 6).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.slug)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all flex-shrink-0 ${
                      selectedCategory === category.slug
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Side - Sort & View */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-all"
                >
                  <span className="hidden sm:inline">Sort:</span>
                  <span className="text-gray-900">{sortOptions.find(o => o.value === sortBy)?.label.split(':')[0] || 'Newest'}</span>
                  <ChevronDown size={16} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showSortDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value)
                            setShowSortDropdown(false)
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            sortBy === option.value
                              ? 'bg-rose-50 text-rose-600'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <option.icon size={16} className={sortBy === option.value ? 'text-rose-500' : 'text-gray-400'} />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* View Toggle - Desktop Only */}
              <div className="hidden md:flex items-center bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-full transition-all ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <Grid3X3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-full transition-all ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Active Filters Display */}
        {(selectedCategory || minPrice || maxPrice || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-gray-500">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm">
                Search: {searchQuery}
                <button onClick={() => setSearchQuery('')} className="hover:text-rose-900">
                  <X size={14} />
                </button>
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm">
                {categories.find(c => c.slug === selectedCategory)?.name}
                <button onClick={() => setSelectedCategory('')} className="hover:text-rose-900">
                  <X size={14} />
                </button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm">
                Price: {minPrice || '0'} - {maxPrice || '∞'}
                <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="hover:text-rose-900">
                  <X size={14} />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-sm text-rose-600 hover:text-rose-700 font-medium ml-2"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <SareeLoader size="lg" text="Finding beautiful sarees for you..." />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <X size={32} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
            <p className="text-gray-500 mb-6">We couldn&apos;t load the products. Please try again.</p>
            <button
              onClick={fetchProducts}
              className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-full font-medium hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/25"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Products */}
        {!loading && !error && (
          <>
            {products.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                  <Package size={40} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-full font-medium hover:bg-rose-600 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                {/* Products Grid */}
                <div className={`grid gap-4 sm:gap-6 mb-10 ${
                  viewMode === 'grid'
                    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                    : 'grid-cols-1 sm:grid-cols-2'
                }`}>
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={`group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ${
                        viewMode === 'list' ? 'flex' : ''
                      }`}
                    >
                      <Link href={`/products/${product.slug}`} className={viewMode === 'list' ? 'flex w-full' : 'block'}>
                        {/* Image Container */}
                        <div className={`relative ${
                          viewMode === 'grid'
                            ? 'aspect-[3/4]'
                            : 'w-36 sm:w-48 flex-shrink-0 aspect-[3/4]'
                        } overflow-hidden bg-gray-100`}>
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />

                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          {/* Badges */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                            {product.isNew && (
                              <span className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
                                NEW
                              </span>
                            )}
                            {product.isBestseller && (
                              <span className="bg-amber-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
                                BESTSELLER
                              </span>
                            )}
                            {product.comparePrice > product.price && (
                              <span className="bg-rose-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
                                {discount(product.price, product.comparePrice)}% OFF
                              </span>
                            )}
                          </div>

                          {/* Out of Stock Overlay */}
                          {!product.inStock && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                              <span className="text-white font-semibold bg-black/50 px-4 py-2 rounded-full">
                                Out of Stock
                              </span>
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                toggleWishlist(product.id)
                              }}
                              className={`p-2.5 rounded-full shadow-lg transition-all ${
                                wishlist.includes(product.id)
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-white text-gray-700 hover:bg-rose-50 hover:text-rose-500'
                              }`}
                            >
                              <Heart
                                size={18}
                                className={wishlist.includes(product.id) ? 'fill-current' : ''}
                              />
                            </button>

                            {product.inStock && (
                              <button
                                onClick={(e) => e.preventDefault()}
                                className="p-2.5 rounded-full bg-white text-gray-700 hover:bg-rose-50 hover:text-rose-500 shadow-lg transition-all"
                              >
                                <ShoppingCart size={18} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-center' : ''}`}>
                          {/* Category */}
                          <p className="text-xs text-rose-500 font-medium mb-1 uppercase tracking-wide">
                            {product.category.name}
                          </p>

                          {/* Name */}
                          <h3 className={`font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-rose-600 transition-colors ${
                            viewMode === 'grid' ? 'text-sm' : 'text-base'
                          }`}>
                            {product.name}
                          </h3>

                          {/* Rating */}
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={12}
                                  className={i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">
                              ({product.reviews})
                            </span>
                          </div>

                          {/* Price */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold text-gray-900 ${
                              viewMode === 'grid' ? 'text-base' : 'text-lg'
                            }`}>
                              {formatPrice(product.price)}
                            </span>
                            {product.comparePrice > product.price && (
                              <span className="text-sm text-gray-400 line-through">
                                {formatPrice(product.comparePrice)}
                              </span>
                            )}
                          </div>

                          {/* Colors */}
                          {product.colors.length > 0 && (
                            <div className="flex items-center gap-1 mt-3">
                              {product.colors.slice(0, 5).map((color, index) => (
                                <div
                                  key={index}
                                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                              {product.colors.length > 5 && (
                                <span className="text-xs text-gray-500 ml-1">+{product.colors.length - 5}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} products
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.hasPrev}
                        className="px-4 py-2 border border-gray-200 rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all"
                      >
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                          let pageNum: number
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i
                          } else {
                            pageNum = pagination.page - 2 + i
                          }

                          if (pageNum > pagination.totalPages || pageNum < 1) return null

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                                pageNum === pagination.page
                                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                                  : 'hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasNext}
                        className="px-4 py-2 border border-gray-200 rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Mobile Filter Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFilters(false)}
          />

          {/* Drawer */}
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Filter Content */}
            <div className="p-4 overflow-y-auto h-[calc(100%-140px)]">
              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Category</h4>
                <div className="space-y-2">
                  <label className="flex items-center p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="mobile-category"
                      value=""
                      checked={!selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-4 h-4 text-rose-500 focus:ring-rose-500"
                    />
                    <span className="ml-3 text-gray-700">All Categories</span>
                  </label>
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="mobile-category"
                        value={category.slug}
                        checked={selectedCategory === category.slug}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-4 h-4 text-rose-500 focus:ring-rose-500"
                      />
                      <span className="ml-3 text-gray-700">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Price Range</h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Min Price</label>
                    <input
                      type="number"
                      placeholder="₹0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <span className="text-gray-300 mt-5">—</span>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Max Price</label>
                    <input
                      type="number"
                      placeholder="₹99,999"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sort By */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Sort By</h4>
                <div className="space-y-2">
                  {sortOptions.map((option) => (
                    <label key={option.value} className="flex items-center p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="mobile-sort"
                        value={option.value}
                        checked={sortBy === option.value}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-4 h-4 text-rose-500 focus:ring-rose-500"
                      />
                      <option.icon size={16} className="ml-3 text-gray-400" />
                      <span className="ml-2 text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
              <div className="flex gap-3">
                <button
                  onClick={clearFilters}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/25"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

// Loading fallback for Suspense
function ProductsPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <SareeLoader size="lg" text="Loading products..." />
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageLoading />}>
      <ProductsContent />
    </Suspense>
  )
}
