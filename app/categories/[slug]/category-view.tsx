'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Filter, Grid, List, ArrowRight, Home } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { RatingBadge } from '@/components/ui/rating-badge'
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
  /** The product's own category — a sub-category of the one being viewed,
   *  since /api/products scopes to the whole subtree. Drives the grouping. */
  category?: { name: string; slug: string } | null
}

interface SubCategory {
  id: string
  name: string
  slug: string
  image: string | null
  count: number
}

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  productCount: number
  children?: SubCategory[]
}

/** One sub-category heading and the products that sit under it. */
interface ProductGroup {
  slug: string
  name: string
  products: Product[]
}

type SortOption = 'newest' | 'price-low' | 'price-high' | 'rating' | 'popular'
type ViewMode = 'grid' | 'list'

/**
 * No pagination UI exists on this page, so the API's default of 12 silently
 * truncated every category with more stock than that. Ask for enough that
 * "all products in this sub-category" is true rather than nearly true.
 */
const PRODUCT_LIMIT = 100

/**
 * Buckets products under their own category.
 *
 * Built from the products themselves rather than from `category.children`, so
 * it handles a sub-category nested more than one level down and never renders a
 * heading with nothing beneath it. Groups follow the order the sub-categories
 * are listed in; anything deeper sorts alphabetically after them.
 */
function groupBySubCategory(
  products: Product[],
  children: SubCategory[]
): ProductGroup[] {
  const order = new Map(children.map((child, index) => [child.slug, index]))
  const groups = new Map<string, ProductGroup>()

  for (const product of products) {
    if (!product.category) continue
    const { slug, name } = product.category
    const group = groups.get(slug) ?? { slug, name, products: [] }
    group.products.push(product)
    groups.set(slug, group)
  }

  const LAST = Number.MAX_SAFE_INTEGER
  // `Array.from`, not `[...groups.values()]` — tsconfig targets es5 without
  // `downlevelIteration`, so spreading a Map iterator is a compile error.
  return Array.from(groups.values()).sort(
    (a, b) =>
      (order.get(a.slug) ?? LAST) - (order.get(b.slug) ?? LAST) ||
      a.name.localeCompare(b.name)
  )
}

/**
 * A single product tile. Extracted so the grouped sub-category sections and the
 * flat listing below them render identical cards from one definition rather
 * than a second copy that drifts.
 */
function ProductCard({
  product,
  viewMode,
}: {
  product: Product
  viewMode: ViewMode
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={
        viewMode === 'grid'
          ? 'group'
          : 'group block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow'
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
              // grid-cols-2 md:grid-cols-3 lg:grid-cols-4
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
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
          <RatingBadge rating={product.rating} reviews={product.reviews} />
        </div>
      ) : (
        // List View
        <div className="flex space-x-4">
          <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="128px"
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
            <RatingBadge
              rating={product.rating}
              reviews={product.reviews}
              className="mb-2"
            />
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
  )
}

export function CategoryView() {
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
  // `null` means "no bound", not zero and not ten thousand. This used to
  // default to { min: 0, max: 10000 } and send that cap on every request, which
  // silently hid every saree priced above ₹10,000 — a whole sub-category's
  // worth — while the Filters badge reported nothing active.
  const [priceRange, setPriceRange] = useState<{
    min: number | null
    max: number | null
  }>({ min: null, max: null })
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
        inStock: inStockOnly.toString(),
        limit: PRODUCT_LIMIT.toString()
      })

      // Only sent once the shopper actually sets a bound, so the API falls back
      // to its own open-ended defaults rather than a cap we invented.
      if (priceRange.min !== null) queryParams.set('minPrice', priceRange.min.toString())
      if (priceRange.max !== null) queryParams.set('maxPrice', priceRange.max.toString())

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

  // Derived from the same fetch the listing below uses, so the two can never
  // disagree and no second request is needed. Filters therefore apply to both.
  const subCategoryGroups = groupBySubCategory(products, category?.children ?? [])

  const clearFilters = () => {
    setPriceRange({ min: null, max: null })
    setSelectedColors([])
    setInStockOnly(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/*
        Hero Banner — the same Banarasi maroon treatment as /products, so a
        category reads as part of the collection rather than a plainer page.
        Kept in sync with app/products/page.tsx by hand; if the palette there
        changes, change it here too.
      */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#3a0f14] via-maroon-800 to-maroon-700 text-white">
        {/* Zari sheen — echoes the woven-gold treatment on the auth screens */}
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-marigold-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-maroon-500/25 blur-3xl" />

        <div className="container relative mx-auto px-4 py-7 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <nav className="flex items-center text-sm text-[#fdf0d8]/70 mb-2">
                <Link href="/" className="flex items-center hover:text-white transition-colors">
                  <Home size={14} className="mr-1" />
                  Home
                </Link>
                <ChevronRight size={14} className="mx-2 text-zari/60" />
                <Link href="/products" className="hover:text-white transition-colors">
                  Products
                </Link>
                <ChevronRight size={14} className="mx-2 text-zari/60" />
                <span className="text-white font-medium">{category.name}</span>
              </nav>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold">
                {category.name}
              </h1>
              {/* Gold rule — the same accent that divides the auth panels */}
              <div className="mt-2 h-px w-16 bg-gradient-to-r from-zari to-transparent sm:w-24" />
              {category.description && (
                <p className="text-[#fdf0d8]/75 mt-2 text-sm sm:text-base">
                  {category.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-zari-light ring-1 ring-zari/30 backdrop-blur-sm">
                {category.productCount} Products
              </span>
            </div>
          </div>
        </div>

        {/* Hairline that separates the banner from the page body */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-zari/50 to-transparent" />
      </div>

      <div className="container mx-auto px-4 py-8">
        {/*
          Products grouped by sub-category. This replaced a grid of
          sub-category tiles, which sent you from one page of category cards to
          another before you ever saw a saree. Each heading still links through
          to its own page, so nothing that was reachable before is lost.

          Always grid-rendered: the list/grid toggle lives in the bar below and
          governs the flat listing it sits with.
        */}
        {category.children && category.children.length > 0 && subCategoryGroups.length > 0 && (
          <section className="mb-10" aria-label={`Products in ${category.name} by sub-category`}>
            {subCategoryGroups.map((group) => (
              <div key={group.slug} className="mb-8 last:mb-0">
                <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-gray-200 pb-2">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    {group.name}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      {group.products.length}{' '}
                      {group.products.length === 1 ? 'product' : 'products'}
                    </span>
                  </h2>
                  <Link
                    href={`/categories/${group.slug}`}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    View all
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {group.products.map((product) => (
                    <ProductCard key={product.id} product={product} viewMode="grid" />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

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
                {(selectedColors.length > 0 || inStockOnly || priceRange.min !== null || priceRange.max !== null) && (
                  <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                    {selectedColors.length + (inStockOnly ? 1 : 0) + (priceRange.min !== null || priceRange.max !== null ? 1 : 0)}
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
                      value={priceRange.min ?? ''}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value === '' ? null : parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max ?? ''}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value === '' ? null : parseInt(e.target.value) || 0 }))}
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
              <ProductCard key={product.id} product={product} viewMode={viewMode} />
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