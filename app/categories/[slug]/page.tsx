'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Filter, X, Grid, List } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { fetchApi } from '@/lib/api'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  image: string
  colors: string[]
  rating: number
  reviews: number
  stock: number
  isNew: boolean
  isBestseller: boolean
  inStock: boolean
}

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  productCount: number
}

type SortOption = 'newest' | 'price-low' | 'price-high' | 'rating' | 'popular'
type ViewMode = 'grid' | 'list'

export default function CategoryPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [category, setCategory] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter and Sort State
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 })
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [inStockOnly, setInStockOnly] = useState(false)
  
  const fetchCategoryAndProducts = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch category details from backend API
      const categoryRes = await fetchApi(`/api/categories/${slug}`)
      if (!categoryRes.ok) {
        throw new Error('Category not found')
      }
      const categoryData = await categoryRes.json()
      setCategory(categoryData)

      // Build query params for products
      const queryParams = new URLSearchParams({
        category: slug,
        sort: sortBy,
        minPrice: priceRange.min.toString(),
        maxPrice: priceRange.max.toString(),
        inStock: inStockOnly.toString()
      })

      if (selectedColors.length > 0) {
        queryParams.append('colors', selectedColors.join(','))
      }

      // Fetch products from backend API
      const productsRes = await fetchApi(`/api/products?${queryParams}`)
      if (!productsRes.ok) {
        throw new Error('Failed to fetch products')
      }
      const productsData = await productsRes.json()
      setProducts(productsData.products || [])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load category')
    } finally {
      setLoading(false)
    }
  }, [slug, sortBy, priceRange, selectedColors, inStockOnly])

  useEffect(() => {
    fetchCategoryAndProducts()
  }, [fetchCategoryAndProducts])

  const clearFilters = () => {
    setPriceRange({ min: 0, max: 10000 })
    setSelectedColors([])
    setInStockOnly(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-square bg-gray-200 rounded-lg"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Category Not Found</h1>
          <p className="text-gray-600 mb-6">The category you&apos;re looking for doesn&apos;t exist.</p>
          <Link 
            href="/products"
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90"
          >
            Browse All Products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href="/" className="hover:text-primary">Home</Link>
            <ChevronRight size={16} />
            <Link href="/products" className="hover:text-primary">Products</Link>
            <ChevronRight size={16} />
            <span className="text-gray-900">{category.name}</span>
          </div>
          
          {/* Category Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{category.name}</h1>
              {category.description && (
                <p className="text-gray-600 mt-2">{category.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">{category.productCount} products</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filter and Sort Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 text-gray-700 hover:text-primary"
              >
                <Filter size={20} />
                <span>Filters</span>
                {(selectedColors.length > 0 || inStockOnly || priceRange.min > 0 || priceRange.max < 10000) && (
                  <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                    {selectedColors.length + (inStockOnly ? 1 : 0) + (priceRange.min > 0 || priceRange.max < 10000 ? 1 : 0)}
                  </span>
                )}
              </button>
              
              {/* View Mode Toggle */}
              <div className="hidden md:flex items-center border border-gray-200 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
            
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
          
          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Price Range */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Price Range</h3>
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) || 10000 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                
                {/* Stock Filter */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Availability</h3>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">In Stock Only</span>
                  </label>
                </div>
                
                {/* Clear Filters */}
                <div className="md:col-span-2 flex items-end">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Products Grid/List */}
        {products.length > 0 ? (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" 
            : "space-y-4"
          }>
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className={viewMode === 'grid' 
                  ? "group" 
                  : "group block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                }
              >
                {viewMode === 'grid' ? (
                  // Grid View
                  <div>
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3 relative">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {product.comparePrice && product.comparePrice > product.price && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}% OFF
                        </div>
                      )}
                      {product.isNew && (
                        <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                          NEW
                        </div>
                      )}
                      {!product.inStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-medium">Out of Stock</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">{product.name}</h3>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-bold text-gray-900">{formatPrice(product.price)}</span>
                        {product.comparePrice && product.comparePrice > product.price && (
                          <span className="text-sm text-gray-500 line-through ml-2">
                            {formatPrice(product.comparePrice)}
                          </span>
                        )}
                      </div>
                    </div>
                    {product.rating > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1">{product.rating}</span>
                        <span className="ml-1">({product.reviews})</span>
                      </div>
                    )}
                  </div>
                ) : (
                  // List View
                  <div className="flex space-x-4">
                    <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                      {!product.inStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Out of Stock</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-2">{product.name}</h3>
                      <div className="flex items-center space-x-4 mb-2">
                        <span className="font-bold text-lg text-gray-900">{formatPrice(product.price)}</span>
                        {product.comparePrice && product.comparePrice > product.price && (
                          <>
                            <span className="text-gray-500 line-through">
                              {formatPrice(product.comparePrice)}
                            </span>
                            <span className="text-red-500 text-sm">
                              {Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}% OFF
                            </span>
                          </>
                        )}
                      </div>
                      {product.rating > 0 && (
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <span className="text-yellow-400">★</span>
                          <span className="ml-1">{product.rating}</span>
                          <span className="ml-1">({product.reviews} reviews)</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-4 text-sm">
                        {product.isNew && (
                          <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">NEW</span>
                        )}
                        {product.isBestseller && (
                          <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">BESTSELLER</span>
                        )}
                        <span className={`${product.inStock ? 'text-green-600' : 'text-red-600'}`}>
                          {product.inStock ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No products found in this category</p>
            <Link 
              href="/products"
              className="text-primary hover:text-primary/80"
            >
              Browse all products
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}