'use client'

import { useState, useEffect, Suspense } from 'react'
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
  ChevronRight
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
    // If sale=true, we could filter for products on sale
    if (sale === 'true') {
      // Products with comparePrice are on sale - this is handled in the API
    }

    setInitialized(true)
  }, [searchParams])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (initialized) {
      fetchProducts()
    }
  }, [searchQuery, selectedCategory, sortBy, minPrice, maxPrice, currentPage, initialized])

  const fetchCategories = async () => {
    try {
      const response = await fetchApi('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchProducts = async () => {
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

      console.log('Fetching products with params:', params.toString())
      const response = await fetchApi(`/api/products?${params}`)

      console.log('Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`)
      }

      const data: ApiResponse = await response.json()
      console.log('Products data:', data)
      setProducts(data.products)
      setPagination(data.pagination)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center text-sm text-gray-600">
            <Link href="/" className="flex items-center hover:text-rose-600 transition-colors">
              <Home size={16} className="mr-1" />
              Home
            </Link>
            <ChevronRight size={16} className="mx-2 text-gray-400" />
            <span className="text-gray-900 font-medium">Products</span>
          </nav>
        </div>
      </div>

      {/* Filter Header */}
      <div className="bg-white shadow-sm sticky top-16 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                {viewMode === 'grid' ? <LayoutGrid size={20} /> : <Grid3X3 size={20} />}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                <Filter size={20} />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Quick Filters - Mobile */}
          <div className="flex space-x-2 overflow-x-auto pb-2 md:hidden">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm ${
                !selectedCategory ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              All
            </button>
            {categories.slice(0, 5).map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.slug)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm ${
                  selectedCategory === category.slug
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Filters - Desktop */}
          <div className={`md:w-64 md:flex-shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  Clear All
                </button>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Category</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="category"
                      value=""
                      checked={!selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">All Categories</span>
                  </label>
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center">
                      <input
                        type="radio"
                        name="category"
                        value={category.slug}
                        checked={selectedCategory === category.slug}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Price Range</h4>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              {/* Sort By */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Sort By</h4>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="popular">Most Popular</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name A-Z</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {loading ? 'Loading...' : `${pagination.totalCount} products found`}
              </p>
              
              {/* Sort - Mobile */}
              <div className="md:hidden">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="popular">Popular</option>
                  <option value="price-low">Price ↑</option>
                  <option value="price-high">Price ↓</option>
                </select>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <SareeLoader size="lg" text="Loading products..." />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Failed to load products</p>
                <button 
                  onClick={fetchProducts}
                  className="bg-primary text-black px-4 py-2 rounded hover:bg-primary/90"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Products Grid */}
            {!loading && !error && (
              <>
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No products found</p>
                    <button 
                      onClick={clearFilters}
                      className="text-primary hover:text-primary/80"
                    >
                      Clear filters to see all products
                    </button>
                  </div>
                ) : (
                  <div className={`grid gap-4 mb-8 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                      : 'grid-cols-1'
                  }`}>
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className={`group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                          viewMode === 'list' ? 'flex' : ''
                        }`}
                      >
                        <Link href={`/products/${product.slug}`} className={viewMode === 'list' ? 'flex w-full' : ''}>
                          <div className={`relative ${
                            viewMode === 'grid' 
                              ? 'aspect-[3/4] mb-3' 
                              : 'w-32 h-32 flex-shrink-0'
                          } overflow-hidden rounded-lg bg-gray-100`}>
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            
                            {/* Badges */}
                            {product.isNew && (
                              <span className="absolute top-2 left-2 z-10 bg-primary text-white text-xs px-2 py-1 rounded">
                                NEW
                              </span>
                            )}
                            {product.isBestseller && (
                              <span className="absolute top-2 left-2 z-10 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                                BESTSELLER
                              </span>
                            )}
                            
                            {/* Discount Badge */}
                            {product.comparePrice > product.price && (
                              <span className="absolute top-2 right-2 z-10 bg-red-500 text-white text-xs px-2 py-1 rounded">
                                {discount(product.price, product.comparePrice)}% OFF
                              </span>
                            )}
                            
                            {/* Stock Status */}
                            {!product.inStock && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                <span className="text-white font-medium">Out of Stock</span>
                              </div>
                            )}
                          </div>

                          <div className={`${viewMode === 'list' ? 'flex-1 p-4' : 'p-3'}`}>
                            <h3 className={`font-medium text-gray-900 line-clamp-2 ${
                              viewMode === 'grid' ? 'text-sm' : 'text-base mb-2'
                            }`}>
                              {product.name}
                            </h3>
                            
                            <p className="text-xs text-gray-500 mb-2">{product.category.name}</p>
                            
                            {/* Rating */}
                            <div className="flex items-center space-x-1 mb-2">
                              <Star size={14} className="fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-gray-600">
                                {product.rating} ({product.reviews})
                              </span>
                            </div>

                            {/* Price */}
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`font-bold text-gray-900 ${
                                viewMode === 'grid' ? 'text-sm' : 'text-base'
                              }`}>
                                {formatPrice(product.price)}
                              </span>
                              {product.comparePrice > product.price && (
                                <span className="text-xs text-gray-500 line-through">
                                  {formatPrice(product.comparePrice)}
                                </span>
                              )}
                            </div>

                            {/* Colors */}
                            {product.colors.length > 0 && (
                              <div className="flex items-center space-x-1">
                                {product.colors.slice(0, 4).map((color, index) => (
                                  <div
                                    key={index}
                                    className="w-3 h-3 rounded-full border border-gray-300"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                                {product.colors.length > 4 && (
                                  <span className="text-xs text-gray-500">+{product.colors.length - 4}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Action Buttons */}
                        <div className="absolute top-2 right-2 flex flex-col space-y-2">
                          <button
                            onClick={() => toggleWishlist(product.id)}
                            className={`p-2 rounded-full transition-all ${
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
                          
                          {product.inStock && (
                            <button className="p-2 rounded-full bg-white/80 text-gray-700 hover:bg-white transition-all">
                              <ShoppingCart size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    
                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      const pageNum = Math.max(1, pagination.page - 2) + i
                      if (pageNum > pagination.totalPages) return null
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-4 py-2 border rounded ${
                            pageNum === pagination.page
                              ? 'bg-primary text-white border-primary'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Overlay */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setShowFilters(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-80 bg-white p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button onClick={() => setShowFilters(false)}>
                <X size={24} />
              </button>
            </div>
            
            {/* Mobile filter content - same as desktop */}
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Category</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mobile-category"
                      value=""
                      checked={!selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">All Categories</span>
                  </label>
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center">
                      <input
                        type="radio"
                        name="mobile-category"
                        value={category.slug}
                        checked={selectedCategory === category.slug}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Price Range</h4>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={clearFilters}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
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