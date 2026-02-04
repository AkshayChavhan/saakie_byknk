'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Eye, Folder, FolderOpen, Upload, Image as ImageIcon } from 'lucide-react'
import { fetchApi } from '@/lib/api'

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
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    parentId: '',
    isActive: true
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetchApi('/api/admin/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (selectedImage) {
        // Use upload API for categories with images
        const uploadFormData = new FormData()
        uploadFormData.append('image', selectedImage)
        uploadFormData.append('data', JSON.stringify(formData))

        const response = await fetchApi('/api/admin/categories/upload', {
          method: 'POST',
          body: uploadFormData
        })

        if (response.ok) {
          const newCategory = await response.json()
          const categoryWithChildren = {
            ...newCategory,
            children: newCategory.children || []
          }
          setCategories([...categories, categoryWithChildren])
          setIsModalOpen(false)
          resetForm()
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to create category')
        }
      } else {
        // Use regular API for categories without images
        const response = await fetchApi('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        if (response.ok) {
          const newCategory = await response.json()
          const categoryWithChildren = {
            ...newCategory,
            children: newCategory.children || []
          }
          setCategories([...categories, categoryWithChildren])
          setIsModalOpen(false)
          resetForm()
        }
      }
    } catch (error) {
      console.error('Failed to create category:', error)
      alert('Failed to create category')
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
  }

  const handleUpdateCategory = async (categoryId: string, updates: Partial<Category>) => {
    try {
      const response = await fetchApi(`/api/admin/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (response.ok) {
        const updatedCategory = await response.json()
        // Ensure children array exists
        const categoryWithChildren = {
          ...updatedCategory,
          children: updatedCategory.children || []
        }
        setCategories(categories.map(cat => 
          cat.id === categoryId ? categoryWithChildren : cat
        ))
      }
    } catch (error) {
      console.error('Failed to update category:', error)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        const response = await fetchApi(`/api/admin/categories/${categoryId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          setCategories(categories.filter(cat => cat.id !== categoryId))
        }
      } catch (error) {
        console.error('Failed to delete category:', error)
      }
    }
  }

  const handleToggleActive = async (categoryId: string, isActive: boolean) => {
    await handleUpdateCategory(categoryId, { isActive })
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const parentCategories = categories.filter(cat => !cat.parentId)

  const CategoryRow = ({ category, level = 0 }: { category: Category; level?: number }) => (
    <>
      <tr key={category.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
            {category.children && category.children.length > 0 ? (
              <FolderOpen className="h-5 w-5 text-gray-500 mr-2" />
            ) : (
              <Folder className="h-5 w-5 text-gray-500 mr-2" />
            )}
            <div>
              <div className="text-sm font-medium text-gray-900">{category.name}</div>
              <div className="text-sm text-gray-500">{category.slug}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {category.description || 'No description'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {category.image ? (
            <img 
              src={category.image} 
              alt={category.name}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-gray-400" />
            </div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {category._count.products}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              checked={category.isActive}
              onChange={(e) => handleToggleActive(category.id, e.target.checked)}
            />
            <span className="ml-2 text-sm text-gray-900">
              {category.isActive ? 'Active' : 'Inactive'}
            </span>
          </label>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {new Date(category.createdAt).toLocaleDateString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCategory(category)}
              className="text-blue-600 hover:text-blue-900"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button className="text-green-600 hover:text-green-900">
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteCategory(category.id)}
              className="text-red-600 hover:text-red-900"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
      {category.children && category.children.map(child => (
        <CategoryRow key={child.id} category={child} level={level + 1} />
      ))}
    </>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Category Management</h1>
          <p className="text-gray-600">Organize your product categories and subcategories</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <Folder className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Categories</p>
                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <FolderOpen className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Active Categories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {categories.filter(c => c.isActive).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <Folder className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Parent Categories</p>
                <p className="text-2xl font-bold text-gray-900">{parentCategories.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <FolderOpen className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Subcategories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {categories.filter(c => c.parentId).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Add */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </button>
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parentCategories.map(category => (
                  <CategoryRow key={category.id} category={category} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Category Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Category</h2>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent Category
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  >
                    <option value="">None (Parent Category)</option>
                    {parentCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                      className="hidden"
                      id="category-image-upload"
                    />
                    <label
                      htmlFor="category-image-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Click to upload category image
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        JPEG, PNG, WebP up to 5MB
                      </span>
                    </label>
                    {selectedImage && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">
                          Selected: {selectedImage.name}
                        </p>
                        <div className="mt-2">
                          <img
                            src={URL.createObjectURL(selectedImage)}
                            alt="Preview"
                            className="h-16 w-16 object-cover rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-900">Active</span>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Create Category
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      resetForm()
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}