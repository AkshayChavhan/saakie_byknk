'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import {
  Search, Edit, Trash2, Eye, Plus, Package, AlertTriangle, X, Upload,
  ArrowLeft, Star, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight,
  IndianRupee, Layers, Tag, ShoppingBag, ImageIcon
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number
  stock: number
  lowStockAlert: number
  isActive: boolean
  isFeatured: boolean
  category: {
    id: string
    name: string
  }
  images: Array<{
    url: string
    isPrimary: boolean
  }>
  createdAt: string
  updatedAt: string
}

interface Category {
  id: string
  name: string
  slug: string
}

export default function ProductsManagement() {
  const { getToken } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isClosingAddModal, setIsClosingAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [isClosingViewModal, setIsClosingViewModal] = useState(false)
  const productsPerPage = 10

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    compareAtPrice: '',
    stock: '',
    lowStockAlert: '10',
    categoryId: '',
    material: '',
    pattern: '',
    occasion: '',
    careInstructions: '',
    weight: '',
    length: '',
    width: '',
    blouseIncluded: false,
    isActive: true,
    isFeatured: false,
    images: [] as File[]
  })
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  // Cleanup image previews
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url))
    }
  }, [imagePreviews])

  const fetchProducts = async () => {
    try {
      const token = await getToken()
      const response = await fetchApi('/api/admin/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        const productsData = Array.isArray(data) ? data : (data.products ?? data.data ?? [])
        setProducts(productsData)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error('Failed to Load', 'Could not load products.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const token = await getToken()
      const response = await fetchApi('/api/admin/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        const categoriesData = Array.isArray(data) ? data : (data.categories ?? data.data ?? [])
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const token = await getToken()
        const response = await fetchApi(`/api/admin/products/${productId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          setProducts(products.filter(product => product.id !== productId))
          toast.success('Product Deleted', `"${productName}" has been deleted.`)
        } else {
          toast.error('Delete Failed', 'Could not delete product.')
        }
      } catch (error) {
        console.error('Failed to delete product:', error)
        toast.error('Delete Failed', 'An error occurred.')
      }
    }
  }

  const handleToggleProductStatus = async (productId: string, isActive: boolean) => {
    try {
      const token = await getToken()
      const response = await fetchApi(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive })
      })
      if (response.ok) {
        setProducts(products.map(product =>
          product.id === productId ? { ...product, isActive } : product
        ))
        toast.success('Updated', `Product ${isActive ? 'activated' : 'deactivated'}.`)
      }
    } catch (error) {
      console.error('Failed to update product status:', error)
      toast.error('Update Failed', 'Could not update status.')
    }
  }

  const handleToggleFeatured = async (productId: string, isFeatured: boolean) => {
    try {
      const token = await getToken()
      const response = await fetchApi(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isFeatured })
      })
      if (response.ok) {
        setProducts(products.map(product =>
          product.id === productId ? { ...product, isFeatured } : product
        ))
        toast.success('Updated', `Product ${isFeatured ? 'featured' : 'unfeatured'}.`)
      }
    } catch (error) {
      console.error('Failed to update product featured status:', error)
    }
  }

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return
    const fileArray = Array.from(files)

    // Clean up old previews
    imagePreviews.forEach(url => URL.revokeObjectURL(url))

    // Create new previews
    const previews = fileArray.map(file => URL.createObjectURL(file))
    setImagePreviews(previews)
    setFormData({ ...formData, images: fileArray })
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.images || formData.images.length === 0) {
        toast.error('Images Required', 'Please select at least one image.')
        setIsSubmitting(false)
        return
      }

      const uploadFormData = new FormData()
      formData.images.forEach((file) => {
        uploadFormData.append('images', file)
      })

      const productData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        price: formData.price,
        comparePrice: formData.compareAtPrice,
        stock: formData.stock,
        lowStockAlert: formData.lowStockAlert,
        categoryId: formData.categoryId,
        material: formData.material,
        pattern: formData.pattern,
        careInstructions: formData.careInstructions,
        weight: formData.weight,
        blouseIncluded: formData.blouseIncluded,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured,
        length: formData.length,
        width: formData.width,
        occasion: formData.occasion,
      }

      uploadFormData.append('data', JSON.stringify(productData))

      const token = await getToken()
      const response = await fetchApi('/api/admin/products/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadFormData
      })

      if (response.ok) {
        const newProduct = await response.json()
        setProducts([newProduct, ...products])
        setShowAddModal(false)
        resetForm()
        toast.success('Product Created', `"${newProduct.name}" has been created.`)
      } else {
        const error = await response.json()
        toast.error('Failed to Create', error.error || 'Something went wrong.')
      }
    } catch (error) {
      console.error('Error creating product:', error)
      toast.error('Failed to Create', 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url))
    setImagePreviews([])
    setFormData({
      name: '',
      slug: '',
      description: '',
      price: '',
      compareAtPrice: '',
      stock: '',
      lowStockAlert: '10',
      categoryId: '',
      material: '',
      pattern: '',
      occasion: '',
      careInstructions: '',
      weight: '',
      length: '',
      width: '',
      blouseIncluded: false,
      isActive: true,
      isFeatured: false,
      images: []
    })
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setFormData({ ...formData, name, slug: generateSlug(name) })
  }

  // Smooth modal closing handlers
  const closeAddModal = () => {
    setIsClosingAddModal(true)
    setTimeout(() => {
      setShowAddModal(false)
      setIsClosingAddModal(false)
      resetForm()
    }, 250)
  }

  const closeViewModal = () => {
    setIsClosingViewModal(true)
    setTimeout(() => {
      setShowViewModal(false)
      setIsClosingViewModal(false)
      setSelectedProduct(null)
    }, 250)
  }

  const filteredProducts = (products ?? []).filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || product.category?.id === categoryFilter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && product.isActive) ||
      (statusFilter === 'inactive' && !product.isActive) ||
      (statusFilter === 'featured' && product.isFeatured) ||
      (statusFilter === 'low_stock' && (product.stock ?? 0) <= (product.lowStockAlert ?? 10)) ||
      (statusFilter === 'out_of_stock' && (product.stock ?? 0) === 0)
    return matchesSearch && matchesCategory && matchesStatus
  })

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  )

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)

  const getStockStatus = (stock: number, lowStockAlert: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' }
    if (stock <= lowStockAlert) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700', dotColor: 'bg-amber-500' }
    return { label: 'In Stock', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-500' }
  }

  const totalValue = (products ?? []).reduce((sum, p) => sum + ((p.price ?? 0) * (p.stock ?? 0)), 0)

  // Mobile Product Card
  const ProductCard = ({ product }: { product: Product }) => {
    const stockStatus = getStockStatus(product.stock ?? 0, product.lowStockAlert ?? 10)
    const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0]

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200 group">
        {/* Image and Basic Info */}
        <div className="p-4">
          <div className="flex gap-4">
            {/* Product Image */}
            <div className="flex-shrink-0">
              {primaryImage ? (
                <img
                  src={primaryImage.url}
                  alt={product.name}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover ring-1 ring-gray-100 group-hover:ring-2 group-hover:ring-red-200 transition-all duration-200"
                />
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-50 group-hover:to-gray-100 transition-all duration-200">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                  <p className="text-sm text-gray-500 truncate">/{product.slug}</p>
                </div>
                {product.isFeatured && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    <Star className="h-3 w-3 fill-current" />
                    Featured
                  </span>
                )}
              </div>

              {/* Price and Stock */}
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className="font-bold text-gray-900">₹{(product.price ?? 0).toLocaleString()}</span>
                {product.comparePrice && product.comparePrice > product.price && (
                  <span className="text-sm text-gray-400 line-through">₹{product.comparePrice.toLocaleString()}</span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${stockStatus.dotColor}`}></span>
                  {product.stock} {stockStatus.label}
                </span>
              </div>

              {/* Category */}
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                  <Tag className="h-3.5 w-3.5" />
                  {product.category?.name ?? 'Uncategorized'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Status Toggle */}
            <button
              onClick={() => handleToggleProductStatus(product.id, !product.isActive)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                product.isActive
                  ? 'text-green-700 hover:bg-green-100'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {product.isActive ? (
                <ToggleRight className="h-5 w-5" />
              ) : (
                <ToggleLeft className="h-5 w-5" />
              )}
              <span className="hidden sm:inline">{product.isActive ? 'Active' : 'Inactive'}</span>
            </button>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleToggleFeatured(product.id, !product.isFeatured)}
                className={`p-2.5 rounded-lg transition-all duration-200 active:scale-90 ${
                  product.isFeatured
                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 hover:shadow-sm'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-amber-600 hover:shadow-sm'
                }`}
                title={product.isFeatured ? 'Remove from featured' : 'Add to featured'}
              >
                <Star className={`h-5 w-5 transition-transform duration-200 hover:scale-110 ${product.isFeatured ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={() => {
                  setSelectedProduct(product)
                  setShowViewModal(true)
                }}
                className="p-2.5 text-blue-600 hover:bg-blue-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
                title="View details"
              >
                <Eye className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
              </button>
              <button
                className="p-2.5 text-emerald-600 hover:bg-emerald-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
                title="Edit product"
              >
                <Edit className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
              </button>
              <button
                onClick={() => handleDeleteProduct(product.id, product.name)}
                className="p-2.5 text-red-600 hover:bg-red-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
                title="Delete product"
              >
                <Trash2 className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Desktop Table Row
  const ProductTableRow = ({ product }: { product: Product }) => {
    const stockStatus = getStockStatus(product.stock ?? 0, product.lowStockAlert ?? 10)
    const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0]

    return (
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4">
          <div className="flex items-center gap-4">
            {primaryImage ? (
              <img
                src={primaryImage.url}
                alt={product.name}
                className="h-14 w-14 rounded-xl object-cover ring-1 ring-gray-200"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-gray-100 flex items-center justify-center ring-1 ring-gray-200">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 truncate max-w-[200px]">{product.name}</p>
                {product.isFeatured && (
                  <Star className="h-4 w-4 text-amber-500 fill-current flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-500">/{product.slug}</p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
            <Tag className="h-3.5 w-3.5" />
            {product.category?.name ?? 'Uncategorized'}
          </span>
        </td>
        <td className="px-6 py-4">
          <div>
            <p className="font-semibold text-gray-900">₹{(product.price ?? 0).toLocaleString()}</p>
            {product.comparePrice && product.comparePrice > product.price && (
              <p className="text-sm text-gray-400 line-through">₹{product.comparePrice.toLocaleString()}</p>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{product.stock}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${stockStatus.dotColor}`}></span>
              {stockStatus.label}
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <button
            onClick={() => handleToggleProductStatus(product.id, !product.isActive)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              product.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {product.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            {product.isActive ? 'Active' : 'Inactive'}
          </button>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleToggleFeatured(product.id, !product.isFeatured)}
              className={`p-2 rounded-lg transition-all duration-200 active:scale-90 ${
                product.isFeatured
                  ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 hover:shadow-sm'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-amber-600 hover:shadow-sm'
              }`}
              title={product.isFeatured ? 'Remove from featured' : 'Add to featured'}
            >
              <Star className={`h-4 w-4 transition-transform duration-200 hover:scale-110 ${product.isFeatured ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => {
                setSelectedProduct(product)
                setShowViewModal(true)
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
              title="View"
            >
              <Eye className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
            </button>
            <button
              className="p-2 text-emerald-600 hover:bg-emerald-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
              title="Edit"
            >
              <Edit className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
            </button>
            <button
              onClick={() => handleDeleteProduct(product.id, product.name)}
              className="p-2 text-red-600 hover:bg-red-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
              title="Delete"
            >
              <Trash2 className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your product catalog and inventory</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl group-hover:bg-blue-200 group-hover:scale-105 transition-all duration-200">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{(products ?? []).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 hover:shadow-md hover:border-green-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl group-hover:bg-green-200 group-hover:scale-105 transition-all duration-200">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Active</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {(products ?? []).filter(p => p.isActive).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 hover:shadow-md hover:border-amber-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl group-hover:bg-amber-200 group-hover:scale-105 transition-all duration-200">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Low Stock</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {(products ?? []).filter(p => (p.stock ?? 0) <= (p.lowStockAlert ?? 10) && (p.stock ?? 0) > 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl group-hover:bg-purple-200 group-hover:scale-105 transition-all duration-200">
                <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Inventory</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">₹{(totalValue / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 mb-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex flex-col gap-4">
            {/* Search and Add Button */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors duration-200" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2.5 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent hover:border-gray-300 transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 font-medium shadow-lg shadow-red-500/25"
              >
                <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white min-w-[140px] hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all duration-200"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white min-w-[140px] hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all duration-200"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="featured">Featured</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products List */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first product'}
            </p>
            {!searchTerm && categoryFilter === 'all' && statusFilter === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 font-medium shadow-lg shadow-red-500/25"
              >
                <Plus className="h-5 w-5" />
                Add Product
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {paginatedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedProducts.map(product => (
                      <ProductTableRow key={product.id} product={product} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * productsPerPage + 1} - {Math.min(currentPage * productsPerPage, filteredProducts.length)} of {filteredProducts.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-gray-200 transition-all duration-200 active:scale-95"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                            currentPage === pageNum
                              ? 'bg-red-600 text-white shadow-md shadow-red-500/25 hover:bg-red-700'
                              : 'hover:bg-gray-100 text-gray-700 hover:shadow-sm'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <span className="sm:hidden text-sm font-medium text-gray-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-gray-200 transition-all duration-200 active:scale-95"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Add Product Modal */}
        {showAddModal && (
          <div
            className={`fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-opacity duration-250 ${
              isClosingAddModal ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={(e) => e.target === e.currentTarget && closeAddModal()}
          >
            <div className={`bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col ${
              isClosingAddModal
                ? 'animate-slide-down sm:animate-fade-out'
                : 'animate-slide-up sm:animate-fade-in'
            }`}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Add New Product</h2>
                <button
                  onClick={closeAddModal}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <form id="product-form" onSubmit={handleFormSubmit} className="space-y-5">
                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Images *</label>
                    <div className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                      imagePreviews.length > 0 ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleImageSelect(e.target.files)}
                        className="hidden"
                        id="product-images"
                      />
                      {imagePreviews.length > 0 ? (
                        <div>
                          <div className="flex flex-wrap gap-3">
                            {imagePreviews.map((url, idx) => (
                              <img key={idx} src={url} alt={`Preview ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg" />
                            ))}
                          </div>
                          <label htmlFor="product-images" className="mt-3 inline-block text-sm text-red-600 hover:text-red-700 cursor-pointer">
                            Change images
                          </label>
                        </div>
                      ) : (
                        <label htmlFor="product-images" className="cursor-pointer flex flex-col items-center py-6">
                          <div className="p-3 bg-gray-100 rounded-xl mb-3">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">Tap to upload images</span>
                          <span className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP • Max 5MB each</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleNameChange}
                        placeholder="e.g., Banarasi Silk Saree"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">URL Slug *</label>
                      <input
                        type="text"
                        required
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="banarasi-silk-saree"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
                    <textarea
                      required
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your product..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Price and Stock */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Price *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="₹0"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Compare Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.compareAtPrice}
                        onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
                        placeholder="₹0"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock *</label>
                      <input
                        type="number"
                        required
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Low Stock Alert</label>
                      <input
                        type="number"
                        value={formData.lowStockAlert}
                        onChange={(e) => setFormData({ ...formData, lowStockAlert: e.target.value })}
                        placeholder="10"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                    <select
                      required
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Material</label>
                      <input
                        type="text"
                        value={formData.material}
                        onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                        placeholder="e.g., Silk"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Pattern</label>
                      <input
                        type="text"
                        value={formData.pattern}
                        onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                        placeholder="e.g., Floral"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Occasion</label>
                      <input
                        type="text"
                        value={formData.occasion}
                        onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                        placeholder="e.g., Wedding"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-xl">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          formData.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isFeatured: !formData.isFeatured })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.isFeatured ? 'bg-amber-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          formData.isFeatured ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className="text-sm text-gray-700">Featured</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, blouseIncluded: !formData.blouseIncluded })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.blouseIncluded ? 'bg-purple-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          formData.blouseIncluded ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className="text-sm text-gray-700">Blouse Included</span>
                    </label>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50">
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={closeAddModal}
                    className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 hover:shadow-sm active:scale-[0.98] transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="product-form"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98] transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      'Create Product'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Product Modal */}
        {showViewModal && selectedProduct && (
          <div
            className={`fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-opacity duration-250 ${
              isClosingViewModal ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={(e) => e.target === e.currentTarget && closeViewModal()}
          >
            <div className={`bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col ${
              isClosingViewModal
                ? 'animate-slide-down sm:animate-fade-out'
                : 'animate-slide-up sm:animate-fade-in'
            }`}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Product Details</h2>
                <button
                  onClick={closeViewModal}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {/* Product Image */}
                <div className="flex justify-center mb-6">
                  {selectedProduct.images?.[0] ? (
                    <img
                      src={selectedProduct.images[0].url}
                      alt={selectedProduct.name}
                      className="h-40 w-40 sm:h-48 sm:w-48 rounded-2xl object-cover ring-2 ring-gray-100"
                    />
                  ) : (
                    <div className="h-40 w-40 sm:h-48 sm:w-48 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Package className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h3>
                    {selectedProduct.isFeatured && <Star className="h-5 w-5 text-amber-500 fill-current" />}
                  </div>
                  <p className="text-gray-500">/{selectedProduct.slug}</p>
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedProduct.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedProduct.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      <Tag className="h-3.5 w-3.5" />
                      {selectedProduct.category?.name}
                    </span>
                  </div>
                </div>

                {/* Price & Stock */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-4 bg-green-50 rounded-xl text-center hover:bg-green-100 hover:shadow-sm transition-all duration-200 cursor-default">
                    <p className="text-2xl font-bold text-green-600">₹{(selectedProduct.price ?? 0).toLocaleString()}</p>
                    <p className="text-sm text-green-600">Price</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl text-center hover:bg-blue-100 hover:shadow-sm transition-all duration-200 cursor-default">
                    <p className="text-2xl font-bold text-blue-600">{selectedProduct.stock ?? 0}</p>
                    <p className="text-sm text-blue-600">In Stock</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Created</span>
                    <span className="text-gray-900">{new Date(selectedProduct.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-500">Updated</span>
                    <span className="text-gray-900">{new Date(selectedProduct.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={closeViewModal}
                  className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 hover:shadow-lg active:scale-[0.98] transition-all duration-200 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-down {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
        @keyframes fade-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-out {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.95); opacity: 0; }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-down { animation: slide-down 0.25s cubic-bezier(0.4, 0, 1, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-out { animation: fade-out 0.2s cubic-bezier(0.4, 0, 1, 1) forwards; }
      `}</style>
    </div>
  )
}
