'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Search, Plus, Edit, Trash2, Eye, Folder, FolderOpen,
  Upload, Image as ImageIcon, X, ChevronDown, ChevronUp,
  Package, ToggleLeft, ToggleRight, ArrowLeft
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  imagePublicId?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  imageFormat?: string | null
  parentId: string | null
  parent: Category | null
  children: Category[]
  isActive: boolean
  _count: {
    products: number
  }
  createdAt: string
  updatedAt: string
}

export default function CategoriesManagement() {
  const { getToken } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isClosingModal, setIsClosingModal] = useState(false)
  const [isClosingViewModal, setIsClosingViewModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    parentId: '',
    isActive: true
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  // Clean up image preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const fetchCategories = async () => {
    try {
      const token = await getToken()
      const response = await fetchApi('/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        const categoriesData = Array.isArray(data) ? data : (data.categories ?? data.data ?? [])
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      toast.error('Failed to Load', 'Could not load categories. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const token = await getToken()
      let response: Response

      if (selectedImage) {
        const uploadFormData = new FormData()
        uploadFormData.append('image', selectedImage)
        uploadFormData.append('data', JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          parentId: formData.parentId || null,
          isActive: formData.isActive
        }))

        response = await fetchApi('/api/admin/categories/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: uploadFormData
        })
      } else {
        response = await fetchApi('/api/admin/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...formData,
            image: formData.image || null
          })
        })
      }

      if (response.ok) {
        const newCategory = await response.json()
        const categoryWithChildren = {
          ...newCategory,
          children: newCategory.children || []
        }
        setCategories([...categories, categoryWithChildren])
        setIsModalOpen(false)
        resetForm()
        toast.success('Category Created', `"${newCategory.name}" has been created successfully.`)
      } else {
        const error = await response.json()
        toast.error('Failed to Create Category', error.error || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      console.error('Failed to create category:', error)
      toast.error('Failed to Create Category', 'An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      image: '',
      parentId: '',
      isActive: true
    })
    setSelectedImage(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
  }

  const handleImageSelect = (file: File | null) => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setSelectedImage(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  const handleUpdateCategory = async (categoryId: string, updates: Partial<Category>) => {
    try {
      const token = await getToken()
      const response = await fetchApi(`/api/admin/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })
      if (response.ok) {
        const updatedCategory = await response.json()
        const categoryWithChildren = {
          ...updatedCategory,
          children: updatedCategory.children || []
        }
        setCategories(categories.map(cat =>
          cat.id === categoryId ? categoryWithChildren : cat
        ))
        toast.success('Updated', 'Category status updated.')
      }
    } catch (error) {
      console.error('Failed to update category:', error)
      toast.error('Update Failed', 'Could not update category.')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        const token = await getToken()
        const categoryToDelete = categories.find(c => c.id === categoryId)
        const response = await fetchApi(`/api/admin/categories/${categoryId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          setCategories(categories.filter(cat => cat.id !== categoryId))
          toast.success('Category Deleted', `"${categoryToDelete?.name}" has been deleted.`)
        } else {
          const error = await response.json()
          toast.error('Delete Failed', error.error || 'Failed to delete category.')
        }
      } catch (error) {
        console.error('Failed to delete category:', error)
        toast.error('Delete Failed', 'An unexpected error occurred.')
      }
    }
  }

  const handleToggleActive = async (categoryId: string, isActive: boolean) => {
    await handleUpdateCategory(categoryId, { isActive })
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  // Smooth modal closing handlers
  const closeModal = () => {
    setIsClosingModal(true)
    setTimeout(() => {
      setIsModalOpen(false)
      setIsClosingModal(false)
      resetForm()
    }, 250)
  }

  const closeViewModal = () => {
    setIsClosingViewModal(true)
    setTimeout(() => {
      setIsViewModalOpen(false)
      setIsClosingViewModal(false)
      setSelectedCategory(null)
    }, 250)
  }

  const toggleCardExpansion = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const filteredCategories = (categories ?? []).filter(category =>
    category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const parentCategories = (categories ?? []).filter(cat => !cat.parentId)
  const totalProducts = (categories ?? []).reduce((sum, cat) => sum + (cat._count?.products ?? 0), 0)

  // Mobile Category Card Component
  const CategoryCard = ({ category, isChild = false }: { category: Category; isChild?: boolean }) => {
    const isExpanded = expandedCards.has(category.id)
    const hasChildren = category.children && category.children.length > 0

    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200 group ${isChild ? 'ml-4 mt-2' : ''}`}>
        {/* Card Header */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Category Image */}
            <div className="flex-shrink-0">
              {category.image ? (
                <Image
                  src={category.image}
                  alt={category.name}
                  width={64}
                  height={64}
                  className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover ring-1 ring-gray-100 group-hover:ring-2 group-hover:ring-red-200 transition-all duration-200"
                />
              ) : (
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-50 group-hover:to-gray-100 transition-all duration-200">
                  <Folder className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400" />
                </div>
              )}
            </div>

            {/* Category Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                  {category.name}
                </h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  category.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {category.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">/{category.slug}</p>

              {/* Quick Stats */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Package className="h-4 w-4" />
                  <span>{category._count?.products ?? 0} products</span>
                </div>
                {hasChildren && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <FolderOpen className="h-4 w-4" />
                    <span>{category.children.length} sub</span>
                  </div>
                )}
              </div>
            </div>

            {/* Expand Button (for cards with children or description) */}
            {(hasChildren || category.description) && (
              <button
                onClick={() => toggleCardExpansion(category.id)}
                className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
            )}
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              {category.description && (
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
              )}
              <div className="text-xs text-gray-500">
                Created {new Date(category.createdAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        {/* Card Actions */}
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Toggle Active */}
            <button
              onClick={() => handleToggleActive(category.id, !category.isActive)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                category.isActive
                  ? 'text-green-700 hover:bg-green-100'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {category.isActive ? (
                <ToggleRight className="h-5 w-5" />
              ) : (
                <ToggleLeft className="h-5 w-5" />
              )}
              <span className="hidden sm:inline">{category.isActive ? 'Active' : 'Inactive'}</span>
            </button>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSelectedCategory(category)
                  setIsViewModalOpen(true)
                }}
                className="p-2.5 text-blue-600 hover:bg-blue-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
                title="View details"
              >
                <Eye className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
              </button>
              <button
                className="p-2.5 text-amber-600 hover:bg-amber-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
                title="Edit category"
              >
                <Edit className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
              </button>
              <button
                onClick={() => handleDeleteCategory(category.id)}
                className="p-2.5 text-red-600 hover:bg-red-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
                title="Delete category"
              >
                <Trash2 className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
              </button>
            </div>
          </div>
        </div>

        {/* Children Categories */}
        {isExpanded && hasChildren && (
          <div className="px-4 pb-4 space-y-2">
            {category.children.map(child => (
              <CategoryCard key={child.id} category={child} isChild />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Desktop Table Row Component
  const CategoryTableRow = ({ category, level = 0 }: { category: Category; level?: number }) => (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4">
          <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
            {category.children && category.children.length > 0 ? (
              <FolderOpen className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0" />
            ) : (
              <Folder className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">{category.name}</div>
              <div className="text-xs text-gray-500">/{category.slug}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <p className="text-sm text-gray-600 line-clamp-2 max-w-xs">
            {category.description || <span className="text-gray-400 italic">No description</span>}
          </p>
        </td>
        <td className="px-6 py-4">
          {category.image ? (
            <Image
              src={category.image}
              alt={category.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg object-cover ring-1 ring-gray-200"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center ring-1 ring-gray-200">
              <ImageIcon className="h-5 w-5 text-gray-400" />
            </div>
          )}
        </td>
        <td className="px-6 py-4">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-900">
            <Package className="h-4 w-4 text-gray-400" />
            {category._count?.products ?? 0}
          </span>
        </td>
        <td className="px-6 py-4">
          <button
            onClick={() => handleToggleActive(category.id, !category.isActive)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              category.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category.isActive ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
            {category.isActive ? 'Active' : 'Inactive'}
          </button>
        </td>
        <td className="px-6 py-4 text-sm text-gray-500">
          {new Date(category.createdAt).toLocaleDateString()}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setSelectedCategory(category)
                setIsViewModalOpen(true)
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
              title="View"
            >
              <Eye className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
            </button>
            <button
              className="p-2 text-amber-600 hover:bg-amber-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
              title="Edit"
            >
              <Edit className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
            </button>
            <button
              onClick={() => handleDeleteCategory(category.id)}
              className="p-2 text-red-600 hover:bg-red-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
              title="Delete"
            >
              <Trash2 className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
            </button>
          </div>
        </td>
      </tr>
      {category.children && category.children.map(child => (
        <CategoryTableRow key={child.id} category={child} level={level + 1} />
      ))}
    </>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading categories...</p>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Organize your product categories and subcategories</p>
        </div>

        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl group-hover:bg-blue-200 group-hover:scale-105 transition-all duration-200">
                <Folder className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{(categories ?? []).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 hover:shadow-md hover:border-green-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl group-hover:bg-green-200 group-hover:scale-105 transition-all duration-200">
                <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Active</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {(categories ?? []).filter(c => c.isActive).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl group-hover:bg-purple-200 group-hover:scale-105 transition-all duration-200">
                <Folder className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Parents</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{parentCategories.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 hover:shadow-md hover:border-amber-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl group-hover:bg-amber-200 group-hover:scale-105 transition-all duration-200">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Products</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalProducts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Add - Mobile Optimized */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 mb-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors duration-200" />
              <input
                type="text"
                placeholder="Search categories..."
                className="w-full pl-10 pr-4 py-2.5 sm:py-2 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent hover:border-gray-300 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 font-medium shadow-lg shadow-red-500/25"
            >
              <Plus className="h-5 w-5" />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Categories - Mobile Cards / Desktop Table */}
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <Folder className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'Try a different search term' : 'Get started by creating your first category'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 font-medium shadow-lg shadow-red-500/25"
              >
                <Plus className="h-5 w-5" />
                Add Category
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {filteredCategories.filter(cat => !cat.parentId).map(category => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Products
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCategories.filter(cat => !cat.parentId).map(category => (
                      <CategoryTableRow key={category.id} category={category} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Add Category Modal - Mobile Optimized */}
        {isModalOpen && (
          <div
            className={`fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-opacity duration-250 ${
              isClosingModal ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div className={`bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col ${
              isClosingModal
                ? 'animate-slide-down sm:animate-fade-out'
                : 'animate-slide-up sm:animate-fade-in'
            }`}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Add New Category</h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <form id="category-form" onSubmit={handleCreateCategory} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Silk Sarees"
                      className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          name: e.target.value,
                          slug: generateSlug(e.target.value)
                        })
                      }}
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      URL Slug *
                    </label>
                    <div className="flex items-center">
                      <span className="text-gray-400 text-sm mr-1">/</span>
                      <input
                        type="text"
                        required
                        placeholder="silk-sarees"
                        className="flex-1 px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      placeholder="Brief description of this category..."
                      className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  {/* Parent Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Parent Category
                    </label>
                    <select
                      className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all bg-white"
                      value={formData.parentId}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    >
                      <option value="">None (Top-level category)</option>
                      {parentCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Category Image
                    </label>
                    <div className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                      imagePreview ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                        className="hidden"
                        id="category-image-upload"
                      />

                      {imagePreview ? (
                        <div className="flex items-center gap-4">
                          <Image
                            src={imagePreview}
                            alt="Preview"
                            width={80}
                            height={80}
                            className="h-20 w-20 object-cover rounded-xl"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {selectedImage?.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {selectedImage && (selectedImage.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <button
                              type="button"
                              onClick={() => handleImageSelect(null)}
                              className="text-sm text-red-600 hover:text-red-700 mt-1"
                            >
                              Remove image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="category-image-upload"
                          className="cursor-pointer flex flex-col items-center py-4"
                        >
                          <div className="p-3 bg-gray-100 rounded-xl mb-3">
                            <Upload className="h-6 w-6 text-gray-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            Tap to upload image
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            JPEG, PNG, WebP • Max 5MB
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">Active Status</p>
                      <p className="text-sm text-gray-500">Make this category visible</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                          formData.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50">
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={closeModal}
                    className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 hover:shadow-sm active:scale-[0.98] transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="category-form"
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
                      'Create Category'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Category Modal */}
        {isViewModalOpen && selectedCategory && (
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
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Category Details</h2>
                <button
                  onClick={closeViewModal}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {/* Category Image */}
                <div className="flex justify-center mb-6">
                  {selectedCategory.image ? (
                    <Image
                      src={selectedCategory.image}
                      alt={selectedCategory.name}
                      width={160}
                      height={160}
                      className="h-32 w-32 sm:h-40 sm:w-40 rounded-2xl object-cover ring-2 ring-gray-100"
                    />
                  ) : (
                    <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Folder className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Category Info */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">{selectedCategory.name}</h3>
                  <p className="text-gray-500">/{selectedCategory.slug}</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-3 ${
                    selectedCategory.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedCategory.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="space-y-4">
                  {selectedCategory.description && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
                      <p className="text-gray-900">{selectedCategory.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-blue-50 rounded-xl text-center hover:bg-blue-100 hover:shadow-sm transition-all duration-200 cursor-default">
                      <p className="text-2xl font-bold text-blue-600">{selectedCategory._count?.products ?? 0}</p>
                      <p className="text-sm text-blue-600">Products</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl text-center hover:bg-purple-100 hover:shadow-sm transition-all duration-200 cursor-default">
                      <p className="text-2xl font-bold text-purple-600">{selectedCategory.children?.length ?? 0}</p>
                      <p className="text-sm text-purple-600">Subcategories</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Created</span>
                      <span className="text-gray-900">{new Date(selectedCategory.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-500">Updated</span>
                      <span className="text-gray-900">{new Date(selectedCategory.updatedAt).toLocaleDateString()}</span>
                    </div>
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

      {/* Custom Styles for Animations */}
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
