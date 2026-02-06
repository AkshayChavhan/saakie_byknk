'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Search, Plus, Edit, Trash2, Eye, Folder, FolderOpen,
  Upload, Image as ImageIcon, X, ChevronDown, ChevronUp,
  Package, ToggleLeft, ToggleRight, ArrowLeft, GitBranch,
  ChevronRight, Circle
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
  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories'>('categories')
  const [isMappedViewOpen, setIsMappedViewOpen] = useState(false)
  const [isClosingMappedView, setIsClosingMappedView] = useState(false)
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'subcategory' | 'products'
    id: string
    name: string
    isActive: boolean
    hasChildren: number
    hasProducts: number
  } | null>(null)
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false)
  const [isClosingDeletePopup, setIsClosingDeletePopup] = useState(false)
  const [isDeletingFromMap, setIsDeletingFromMap] = useState(false)
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
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const fetchCategories = useCallback(async () => {
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
  }, [getToken, toast])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Clean up image preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const token = await getToken()
      let response: Response
      const isEditing = !!editingCategory

      if (isEditing) {
        // Update existing category
        response = await fetchApi(`/api/admin/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            parentId: formData.parentId || null,
            isActive: formData.isActive
          })
        })
      } else if (selectedImage) {
        // Create with image upload
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
        // Create without image
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
        const savedCategory = await response.json()
        const categoryWithChildren = {
          ...savedCategory,
          children: savedCategory.children || []
        }

        if (isEditing) {
          setCategories(categories.map(cat =>
            cat.id === editingCategory.id ? categoryWithChildren : cat
          ))
          toast.success('Category Updated', `"${savedCategory.name}" has been updated successfully.`)
        } else {
          setCategories([...categories, categoryWithChildren])
          toast.success('Category Created', `"${savedCategory.name}" has been created successfully.`)
        }

        setIsModalOpen(false)
        resetForm()
      } else {
        const error = await response.json()
        toast.error(isEditing ? 'Failed to Update Category' : 'Failed to Create Category', error.error || 'Something went wrong. Please try again.')
      }
    } catch (error) {
      console.error('Failed to save category:', error)
      toast.error('Failed to Save Category', 'An unexpected error occurred. Please try again.')
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
    setEditingCategory(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
  }

  const openEditModal = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: category.image || '',
      parentId: category.parentId || '',
      isActive: category.isActive
    })
    if (category.image) {
      setImagePreview(category.image)
    }
    setIsModalOpen(true)
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

  const closeMappedView = () => {
    setIsClosingMappedView(true)
    setTimeout(() => {
      setIsMappedViewOpen(false)
      setIsClosingMappedView(false)
    }, 250)
  }

  const toggleTreeNode = (id: string) => {
    setExpandedTreeNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const expandAllTreeNodes = () => {
    const allIds = new Set<string>()
    parentCategories.forEach(cat => {
      allIds.add(cat.id)
      cat.children?.forEach(child => allIds.add(child.id))
    })
    setExpandedTreeNodes(allIds)
  }

  const collapseAllTreeNodes = () => {
    setExpandedTreeNodes(new Set())
  }

  // Delete popup handlers for Mapped View
  const openDeletePopup = (
    type: 'category' | 'subcategory' | 'products',
    id: string,
    name: string,
    isActive: boolean,
    hasChildren: number,
    hasProducts: number
  ) => {
    setDeleteTarget({ type, id, name, isActive, hasChildren, hasProducts })
    setIsDeletePopupOpen(true)
  }

  const closeDeletePopup = () => {
    setIsClosingDeletePopup(true)
    setTimeout(() => {
      setIsDeletePopupOpen(false)
      setIsClosingDeletePopup(false)
      setDeleteTarget(null)
    }, 200)
  }

  const canDelete = (target: typeof deleteTarget) => {
    if (!target) return { allowed: false, reasons: ['No target selected'] }

    const reasons: string[] = []

    // Check if active
    if (target.isActive && target.type !== 'products') {
      reasons.push('Category is currently active. Please deactivate it first.')
    }

    // Check if has children (for categories)
    if (target.type === 'category' && target.hasChildren > 0) {
      reasons.push(`Has ${target.hasChildren} sub-categor${target.hasChildren === 1 ? 'y' : 'ies'}. Delete them first.`)
    }

    // Check if has products
    if (target.type !== 'products' && target.hasProducts > 0) {
      reasons.push(`Has ${target.hasProducts} product${target.hasProducts === 1 ? '' : 's'} linked. Reassign or delete them first.`)
    }

    return { allowed: reasons.length === 0, reasons }
  }

  const handleDeleteFromMap = async () => {
    if (!deleteTarget) return

    const validation = canDelete(deleteTarget)
    if (!validation.allowed) return

    setIsDeletingFromMap(true)
    try {
      const token = await getToken()
      const response = await fetchApi(`/api/admin/categories/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setCategories(categories.filter(cat => cat.id !== deleteTarget.id))
        toast.success('Deleted Successfully', `"${deleteTarget.name}" has been deleted.`)
        closeDeletePopup()
      } else {
        const error = await response.json()
        toast.error('Delete Failed', error.error || 'Failed to delete. Please try again.')
      }
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Delete Failed', 'An unexpected error occurred.')
    } finally {
      setIsDeletingFromMap(false)
    }
  }

  // Filter categories based on active tab
  const parentCategories = (categories ?? []).filter(cat => !cat.parentId)
  const subCategories = (categories ?? []).filter(cat => cat.parentId)

  const filteredCategories = (activeTab === 'categories' ? parentCategories : subCategories).filter(category =>
    category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

              {/* Parent Category Badge (for subcategories) */}
              {isChild && category.parent && (
                <div className="mt-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                    <Folder className="h-3 w-3" />
                    {category.parent.name}
                  </span>
                </div>
              )}

              {/* Quick Stats */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Package className="h-4 w-4" />
                  <span>{category._count?.products ?? 0} products</span>
                </div>
                {hasChildren && !isChild && (
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
                onClick={() => openEditModal(category)}
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
  const CategoryTableRow = ({ category, level = 0, showParent = false }: { category: Category; level?: number; showParent?: boolean }) => (
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
        {showParent && (
          <td className="px-6 py-4">
            {category.parent ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">
                <Folder className="h-3.5 w-3.5" />
                {category.parent.name}
              </span>
            ) : (
              <span className="text-gray-400 italic text-sm">No parent</span>
            )}
          </td>
        )}
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
              onClick={() => openEditModal(category)}
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
      {!showParent && category.children && category.children.map(child => (
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

        {/* Stats Cards & Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
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

          {/* Quick Action - Mapped View */}
          <div
            onClick={() => {
              expandAllTreeNodes()
              setIsMappedViewOpen(true)
            }}
            className="col-span-2 lg:col-span-1 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-xl shadow-lg p-4 sm:p-5 border border-purple-400 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'30\' height=\'30\' viewBox=\'0 0 30 30\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z\' fill=\'rgba(255,255,255,0.1)\'/%3E%3C/svg%3E')] opacity-60"></div>
            {/* Glow Effect */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
            <div className="relative flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300 ring-1 ring-white/30">
                <GitBranch className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-white/80 font-medium">Quick Action</p>
                <p className="text-base sm:text-lg font-bold text-white">Mapped View</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-1.5 mb-6 border border-gray-100">
          <div className="flex gap-1">
            <button
              onClick={() => {
                setActiveTab('categories')
                setSearchTerm('')
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm sm:text-base transition-all duration-200 ${
                activeTab === 'categories'
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/25'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Folder className="h-5 w-5" />
              <span>Categories</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'categories'
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {parentCategories.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('subcategories')
                setSearchTerm('')
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm sm:text-base transition-all duration-200 ${
                activeTab === 'subcategories'
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/25'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <FolderOpen className="h-5 w-5" />
              <span>Sub-Categories</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'subcategories'
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {subCategories.length}
              </span>
            </button>
          </div>
        </div>

        {/* Search and Add - Mobile Optimized */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 mb-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors duration-200" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'categories' ? 'categories' : 'sub-categories'}...`}
                className="w-full pl-10 pr-4 py-2.5 sm:py-2 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent hover:border-gray-300 transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:gap-3">
              {/* Mapped View Button */}
              <button
                onClick={() => {
                  expandAllTreeNodes()
                  setIsMappedViewOpen(true)
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 font-medium shadow-lg shadow-purple-500/25"
                title="View Category Map"
              >
                <GitBranch className="h-5 w-5" />
                <span className="hidden sm:inline">Map View</span>
              </button>
              {/* Add Category/Sub-Category Button */}
              <button
                onClick={() => {
                  if (activeTab === 'subcategories') {
                    setFormData({ ...formData, parentId: parentCategories[0]?.id || '' })
                  } else {
                    setFormData({ ...formData, parentId: '' })
                  }
                  setIsModalOpen(true)
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 font-medium shadow-lg shadow-red-500/25"
              >
                <Plus className="h-5 w-5" />
                <span>Add {activeTab === 'categories' ? 'Category' : 'Sub-Category'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Categories - Mobile Cards / Desktop Table */}
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-100 hover:shadow-md transition-shadow duration-200">
            {activeTab === 'categories' ? (
              <Folder className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4 animate-pulse" />
            ) : (
              <FolderOpen className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4 animate-pulse" />
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {activeTab === 'categories' ? 'categories' : 'sub-categories'} found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? 'Try a different search term'
                : activeTab === 'categories'
                  ? 'Get started by creating your first category'
                  : parentCategories.length === 0
                    ? 'Create a parent category first before adding sub-categories'
                    : 'Get started by creating your first sub-category'
              }
            </p>
            {!searchTerm && (activeTab === 'categories' || parentCategories.length > 0) && (
              <button
                onClick={() => {
                  if (activeTab === 'subcategories') {
                    setFormData({ ...formData, parentId: parentCategories[0]?.id || '' })
                  } else {
                    setFormData({ ...formData, parentId: '' })
                  }
                  setIsModalOpen(true)
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 font-medium shadow-lg shadow-red-500/25"
              >
                <Plus className="h-5 w-5" />
                Add {activeTab === 'categories' ? 'Category' : 'Sub-Category'}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {filteredCategories.map(category => (
                <CategoryCard key={category.id} category={category} isChild={activeTab === 'subcategories'} />
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {activeTab === 'categories' ? 'Category' : 'Sub-Category'}
                      </th>
                      {activeTab === 'subcategories' && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Parent
                        </th>
                      )}
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
                    {filteredCategories.map(category => (
                      <CategoryTableRow key={category.id} category={category} showParent={activeTab === 'subcategories'} />
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
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {editingCategory
                    ? editingCategory.parentId ? 'Edit Sub-Category' : 'Edit Category'
                    : formData.parentId ? 'Add New Sub-Category' : 'Add New Category'
                  }
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <form id="category-form" onSubmit={handleSubmitCategory} className="space-y-4">
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
                      Parent Category {activeTab === 'subcategories' && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all bg-white"
                      value={formData.parentId}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                      required={activeTab === 'subcategories'}
                    >
                      <option value="">None (Top-level category)</option>
                      {parentCategories
                        .filter(cat => cat.id !== editingCategory?.id) // Prevent selecting self as parent
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    {activeTab === 'subcategories' && !formData.parentId && (
                      <p className="text-xs text-amber-600 mt-1">Please select a parent category for the sub-category</p>
                    )}
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
                        {editingCategory ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingCategory
                        ? editingCategory.parentId ? 'Update Sub-Category' : 'Update Category'
                        : formData.parentId ? 'Create Sub-Category' : 'Create Category'
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

        {/* Mapped View Modal - Enhanced Tree Diagram */}
        {isMappedViewOpen && (
          <div
            className={`fixed inset-0 bg-gradient-to-br from-black/70 via-purple-900/20 to-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-all duration-300 ${
              isClosingMappedView ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={(e) => e.target === e.currentTarget && closeMappedView()}
          >
            <div className={`bg-gradient-to-b from-white to-gray-50 w-full sm:max-w-5xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl ${
              isClosingMappedView
                ? 'animate-slide-down sm:animate-fade-out'
                : 'animate-slide-up sm:animate-fade-in'
            }`}>
              {/* Modal Header - Gradient */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'30\' height=\'30\' viewBox=\'0 0 30 30\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z\' fill=\'rgba(255,255,255,0.07)\'/%3E%3C/svg%3E')] opacity-60"></div>
                <div className="relative flex items-center justify-between p-4 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-white/30 animate-pulse-slow">
                      <GitBranch className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Category Map</h2>
                      <p className="text-sm text-white/70 mt-0.5">Interactive hierarchy visualization</p>
                    </div>
                  </div>
                  <button
                    onClick={closeMappedView}
                    className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ring-1 ring-white/20"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Controls Bar */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200/80 bg-white/80 backdrop-blur-sm flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={expandAllTreeNodes}
                    className="group px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-xl hover:bg-purple-200 hover:shadow-md hover:shadow-purple-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2"
                  >
                    <ChevronDown className="h-4 w-4 group-hover:animate-bounce" />
                    <span className="hidden sm:inline">Expand All</span>
                    <span className="sm:hidden">Expand</span>
                  </button>
                  <button
                    onClick={collapseAllTreeNodes}
                    className="group px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2"
                  >
                    <ChevronUp className="h-4 w-4 group-hover:animate-bounce" />
                    <span className="hidden sm:inline">Collapse All</span>
                    <span className="sm:hidden">Collapse</span>
                  </button>
                </div>
                <div className="ml-auto flex items-center gap-3 sm:gap-5 text-xs sm:text-sm">
                  <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-sm shadow-blue-500/50 animate-pulse-slow"></div>
                    <span className="text-blue-700 font-medium hidden sm:inline">Category</span>
                    <span className="text-blue-700 font-medium sm:hidden">Cat</span>
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-sm shadow-purple-500/50 animate-pulse-slow"></div>
                    <span className="text-purple-700 font-medium hidden sm:inline">Sub-Category</span>
                    <span className="text-purple-700 font-medium sm:hidden">Sub</span>
                  </span>
                  <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm shadow-emerald-500/50 animate-pulse-slow"></div>
                    <span className="text-emerald-700 font-medium hidden sm:inline">Products</span>
                    <span className="text-emerald-700 font-medium sm:hidden">Prod</span>
                  </span>
                </div>
              </div>

              {/* Tree Diagram - Enhanced */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-gray-50/50 to-white">
                {parentCategories.length === 0 ? (
                  <div className="text-center py-16 animate-fade-in">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-purple-200 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                      <GitBranch className="relative h-16 w-16 text-purple-300 mx-auto mb-6" />
                    </div>
                    <p className="text-gray-500 text-lg">No categories to display</p>
                    <p className="text-gray-400 text-sm mt-2">Create your first category to see it here</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {parentCategories.map((category, catIndex) => {
                      const isCatExpanded = expandedTreeNodes.has(category.id)
                      const hasContent = (category.children?.length ?? 0) > 0 || (category._count?.products ?? 0) > 0

                      return (
                        <div
                          key={category.id}
                          className="tree-node animate-fade-in-up"
                          style={{ animationDelay: `${catIndex * 50}ms` }}
                        >
                          {/* Parent Category Card */}
                          <div
                            className={`group relative flex items-center gap-3 p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
                              isCatExpanded
                                ? 'bg-gradient-to-r from-blue-50 via-blue-50 to-indigo-50 border-blue-300 shadow-lg shadow-blue-500/10'
                                : 'bg-white border-blue-200 hover:border-blue-300 hover:bg-blue-50/50 shadow-md'
                            }`}
                            onClick={() => toggleTreeNode(category.id)}
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              openDeletePopup(
                                'category',
                                category.id,
                                category.name,
                                category.isActive,
                                category.children?.length ?? 0,
                                category._count?.products ?? 0
                              )
                            }}
                          >
                            {/* Decorative gradient line */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-blue-400 via-blue-500 to-indigo-500 transition-opacity duration-300 ${isCatExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></div>

                            {/* Expand/Collapse Button */}
                            <button className={`p-2 rounded-xl transition-all duration-300 ${
                              hasContent
                                ? 'bg-blue-100 hover:bg-blue-200 hover:shadow-md group-hover:scale-110'
                                : 'bg-gray-100'
                            }`}>
                              {hasContent ? (
                                <ChevronRight className={`h-5 w-5 text-blue-600 transition-transform duration-300 ${isCatExpanded ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
                              ) : (
                                <Circle className="h-3 w-3 text-gray-400" />
                              )}
                            </button>

                            {/* Category Icon */}
                            <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                              isCatExpanded
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30'
                                : 'bg-blue-100 group-hover:bg-blue-200'
                            }`}>
                              <Folder className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-300 ${isCatExpanded ? 'text-white' : 'text-blue-600'}`} />
                            </div>

                            {/* Category Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate group-hover:text-blue-900 transition-colors">
                                {category.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-500 truncate">/{category.slug}</p>
                            </div>

                            {/* Badges */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                                category.isActive
                                  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                                  : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
                              }`}>
                                {category.isActive ? '● Active' : '○ Inactive'}
                              </span>
                              {(category._count?.products ?? 0) > 0 && (
                                <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold ring-1 ring-blue-200">
                                  <Package className="h-3 w-3" />
                                  {category._count?.products}
                                </span>
                              )}
                              {(category.children?.length ?? 0) > 0 && (
                                <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold ring-1 ring-purple-200">
                                  <FolderOpen className="h-3 w-3" />
                                  {category.children?.length}
                                </span>
                              )}
                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openDeletePopup(
                                    'category',
                                    category.id,
                                    category.name,
                                    category.isActive,
                                    category.children?.length ?? 0,
                                    category._count?.products ?? 0
                                  )
                                }}
                                className="opacity-0 group-hover:opacity-100 p-2 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/20 active:scale-95"
                                title="Delete category"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Children Container with Animation */}
                          <div className={`overflow-hidden transition-all duration-500 ease-out ${
                            isCatExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                          }`}>
                            <div className="ml-4 sm:ml-8 mt-3 pl-4 sm:pl-6 border-l-3 border-dashed border-blue-200 space-y-3 relative">
                              {/* Connecting dot */}
                              <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-blue-300 border-2 border-white shadow-sm"></div>

                              {/* Sub-categories */}
                              {category.children?.map((subCat, subIndex) => {
                                const isSubExpanded = expandedTreeNodes.has(subCat.id)
                                const hasProducts = (subCat._count?.products ?? 0) > 0

                                return (
                                  <div
                                    key={subCat.id}
                                    className="tree-node animate-fade-in-left"
                                    style={{ animationDelay: `${subIndex * 30}ms` }}
                                  >
                                    {/* Sub-category Card */}
                                    <div
                                      className={`group relative flex items-center gap-2.5 p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg ${
                                        isSubExpanded
                                          ? 'bg-gradient-to-r from-purple-50 to-fuchsia-50 border-purple-300 shadow-md shadow-purple-500/10'
                                          : 'bg-white border-purple-200 hover:border-purple-300 hover:bg-purple-50/50 shadow-sm'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleTreeNode(subCat.id)
                                      }}
                                      onDoubleClick={(e) => {
                                        e.stopPropagation()
                                        openDeletePopup(
                                          'subcategory',
                                          subCat.id,
                                          subCat.name,
                                          subCat.isActive,
                                          0,
                                          subCat._count?.products ?? 0
                                        )
                                      }}
                                    >
                                      {/* Decorative line */}
                                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-purple-400 to-fuchsia-400 transition-opacity duration-300 ${isSubExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></div>

                                      {/* Expand Button */}
                                      <button className={`p-1.5 rounded-lg transition-all duration-300 ${
                                        hasProducts
                                          ? 'bg-purple-100 hover:bg-purple-200 group-hover:scale-110'
                                          : 'bg-gray-100'
                                      }`}>
                                        {hasProducts ? (
                                          <ChevronRight className={`h-4 w-4 text-purple-600 transition-transform duration-300 ${isSubExpanded ? 'rotate-90' : ''}`} />
                                        ) : (
                                          <Circle className="h-2 w-2 text-gray-400" />
                                        )}
                                      </button>

                                      {/* Icon */}
                                      <div className={`p-2 rounded-lg transition-all duration-300 ${
                                        isSubExpanded
                                          ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-md shadow-purple-500/30'
                                          : 'bg-purple-100 group-hover:bg-purple-200'
                                      }`}>
                                        <FolderOpen className={`h-4 w-4 transition-colors duration-300 ${isSubExpanded ? 'text-white' : 'text-purple-600'}`} />
                                      </div>

                                      {/* Info */}
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate group-hover:text-purple-900 transition-colors">
                                          {subCat.name}
                                        </h4>
                                        <p className="text-xs text-gray-500 truncate hidden sm:block">/{subCat.slug}</p>
                                      </div>

                                      {/* Badges */}
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          subCat.isActive
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                          {subCat.isActive ? '●' : '○'}
                                        </span>
                                        {hasProducts && (
                                          <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                            <Package className="h-3 w-3" />
                                            {subCat._count?.products}
                                          </span>
                                        )}
                                        {/* Delete Button */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            openDeletePopup(
                                              'subcategory',
                                              subCat.id,
                                              subCat.name,
                                              subCat.isActive,
                                              0,
                                              subCat._count?.products ?? 0
                                            )
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/20 active:scale-95"
                                          title="Delete sub-category"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Products under sub-category */}
                                    <div className={`overflow-hidden transition-all duration-400 ease-out ${
                                      isSubExpanded && hasProducts ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                    }`}>
                                      <div className="ml-6 sm:ml-10 mt-2 pl-4 border-l-2 border-dashed border-purple-200">
                                        <div
                                          className="group flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 hover:shadow-md hover:border-emerald-300 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toast.info('Products', `${subCat._count?.products ?? 0} product(s) linked to "${subCat.name}". Manage products in the Products section.`)
                                          }}
                                        >
                                          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                                            <Package className="h-4 w-4 text-white" />
                                          </div>
                                          <div>
                                            <span className="text-sm font-bold text-emerald-800">
                                              {subCat._count?.products} Product{(subCat._count?.products ?? 0) !== 1 ? 's' : ''}
                                            </span>
                                            <p className="text-xs text-emerald-600">linked to this sub-category</p>
                                          </div>
                                          <div className="ml-auto flex -space-x-1">
                                            {[...Array(Math.min(3, subCat._count?.products ?? 0))].map((_, i) => (
                                              <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-200 to-teal-200 border-2 border-white flex items-center justify-center">
                                                <Package className="h-3 w-3 text-emerald-600" />
                                              </div>
                                            ))}
                                            {(subCat._count?.products ?? 0) > 3 && (
                                              <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-700">
                                                +{(subCat._count?.products ?? 0) - 3}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}

                              {/* Direct products under parent category */}
                              {(category._count?.products ?? 0) > 0 && (
                                <div
                                  className="group flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 hover:shadow-md hover:border-emerald-300 transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in-left cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toast.info('Products', `${category._count?.products ?? 0} product(s) linked to "${category.name}". Manage products in the Products section.`)
                                  }}
                                >
                                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                                    <Package className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <span className="text-sm font-bold text-emerald-800">
                                      {category._count?.products} Product{(category._count?.products ?? 0) !== 1 ? 's' : ''}
                                    </span>
                                    <p className="text-xs text-emerald-600">
                                      {(category.children?.length ?? 0) > 0 ? 'directly in this category' : 'in this category'}
                                    </p>
                                  </div>
                                  <div className="ml-auto flex -space-x-1">
                                    {[...Array(Math.min(3, category._count?.products ?? 0))].map((_, i) => (
                                      <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-200 to-teal-200 border-2 border-white flex items-center justify-center">
                                        <Package className="h-3 w-3 text-emerald-600" />
                                      </div>
                                    ))}
                                    {(category._count?.products ?? 0) > 3 && (
                                      <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-700">
                                        +{(category._count?.products ?? 0) - 3}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Empty state */}
                              {(!category.children || category.children.length === 0) && (!category._count || category._count.products === 0) && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500 animate-fade-in">
                                  <div className="p-2 bg-gray-100 rounded-lg">
                                    <Circle className="h-4 w-4 text-gray-400" />
                                  </div>
                                  <span className="text-sm italic">No sub-categories or products yet</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer - Enhanced */}
              <div className="relative overflow-hidden border-t border-gray-200">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-white to-blue-50"></div>
                <div className="relative p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Stats */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-blue-100">
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                          <Folder className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-center">
                          <span className="text-lg font-bold text-gray-900">{parentCategories.length}</span>
                          <p className="text-xs text-gray-500">Categories</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-purple-100">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          <FolderOpen className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="text-center">
                          <span className="text-lg font-bold text-gray-900">{subCategories.length}</span>
                          <p className="text-xs text-gray-500">Sub-Categories</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-emerald-100">
                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                          <Package className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="text-center">
                          <span className="text-lg font-bold text-gray-900">{totalProducts}</span>
                          <p className="text-xs text-gray-500">Products</p>
                        </div>
                      </div>
                    </div>
                    {/* Close Button */}
                    <button
                      onClick={closeMappedView}
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-700 hover:shadow-xl hover:shadow-gray-900/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 font-semibold flex items-center justify-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Close Map
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Popup - Animated */}
        {isDeletePopupOpen && deleteTarget && (
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all duration-200 ${
              isClosingDeletePopup ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={(e) => e.target === e.currentTarget && closeDeletePopup()}
          >
            <div className={`bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-300 ${
              isClosingDeletePopup
                ? 'scale-95 opacity-0 translate-y-4'
                : 'scale-100 opacity-100 translate-y-0 animate-bounce-in'
            }`}>
              {/* Header with Icon */}
              <div className="relative overflow-hidden">
                <div className={`absolute inset-0 ${
                  deleteTarget.type === 'category'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    : deleteTarget.type === 'subcategory'
                      ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}></div>
                <div className="relative p-6 text-center">
                  <div className="inline-flex p-4 bg-white/20 backdrop-blur-sm rounded-full mb-4 animate-shake">
                    <Trash2 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Delete {deleteTarget.type === 'category' ? 'Category' : 'Sub-Category'}?</h3>
                  <p className="text-white/80 mt-1 text-sm">This action cannot be undone</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Target Info */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-4">
                  <div className={`p-2.5 rounded-xl ${
                    deleteTarget.type === 'category'
                      ? 'bg-blue-100'
                      : deleteTarget.type === 'subcategory'
                        ? 'bg-purple-100'
                        : 'bg-emerald-100'
                  }`}>
                    {deleteTarget.type === 'category' ? (
                      <Folder className="h-6 w-6 text-blue-600" />
                    ) : deleteTarget.type === 'subcategory' ? (
                      <FolderOpen className="h-6 w-6 text-purple-600" />
                    ) : (
                      <Package className="h-6 w-6 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{deleteTarget.name}</h4>
                    <p className="text-sm text-gray-500 capitalize">{deleteTarget.type}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    deleteTarget.isActive
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {deleteTarget.isActive ? '● Active' : '○ Inactive'}
                  </span>
                </div>

                {/* Validation Messages */}
                {(() => {
                  const validation = canDelete(deleteTarget)
                  return (
                    <div className="space-y-3">
                      {!validation.allowed ? (
                        <>
                          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200 animate-fade-in">
                            <div className="p-1.5 bg-red-100 rounded-lg flex-shrink-0 mt-0.5">
                              <X className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium text-red-800">Cannot Delete</p>
                              <p className="text-sm text-red-600 mt-1">Please resolve the following issues first:</p>
                            </div>
                          </div>
                          <ul className="space-y-2">
                            {validation.reasons.map((reason, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800 animate-fade-in-left"
                                style={{ animationDelay: `${index * 100}ms` }}
                              >
                                <span className="text-amber-500 flex-shrink-0">⚠</span>
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200 animate-fade-in">
                          <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0 mt-0.5">
                            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-green-800">Ready to Delete</p>
                            <p className="text-sm text-green-600 mt-1">
                              This {deleteTarget.type} can be safely deleted.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Actions */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button
                  onClick={closeDeletePopup}
                  disabled={isDeletingFromMap}
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-100 hover:border-gray-300 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteFromMap}
                  disabled={isDeletingFromMap || !canDelete(deleteTarget).allowed}
                  className={`flex-1 px-4 py-3 font-medium rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200 ${
                    canDelete(deleteTarget).allowed
                      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:shadow-red-500/30'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isDeletingFromMap ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
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
        @keyframes fade-in-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in-left {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.5) translateY(50px); opacity: 0; }
          50% { transform: scale(1.05) translateY(-10px); }
          70% { transform: scale(0.98) translateY(5px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-5deg); }
          20%, 40%, 60%, 80% { transform: rotate(5deg); }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-down { animation: slide-down 0.25s cubic-bezier(0.4, 0, 1, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-out { animation: fade-out 0.2s cubic-bezier(0.4, 0, 1, 1) forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in-left { animation: fade-in-left 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .border-l-3 { border-left-width: 3px; }
      `}</style>
    </div>
  )
}
