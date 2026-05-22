'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Plus, Edit, Trash2, X, ArrowLeft, Megaphone, ImageIcon,
  ToggleLeft, ToggleRight, ExternalLink
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

interface Banner {
  id: string
  title: string
  description: string | null
  image: string | null
  link: string | null
  backgroundColor: string | null
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const emptyForm = {
  title: '',
  description: '',
  link: '',
  backgroundColor: '',
  order: '0',
  isActive: true,
}

export default function PromotionalBannersManagement() {
  const router = useRouter()
  const toast = useToast()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [existingImage, setExistingImage] = useState<string | null>(null)

  const isEditMode = editingId !== null

  const fetchBanners = useCallback(async () => {
    try {
      const response = await fetchApi('/api/admin/promotional-banners')
      if (response.ok) {
        setBanners(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch banners:', error)
      toast.error('Failed to Load', 'Could not load promotional banners.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const resetForm = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    setSelectedImage(null)
    setExistingImage(null)
    setEditingId(null)
    setFormData(emptyForm)
  }

  const openCreate = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (banner: Banner) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    setSelectedImage(null)
    setFormData({
      title: banner.title ?? '',
      description: banner.description ?? '',
      link: banner.link ?? '',
      backgroundColor: banner.backgroundColor ?? '',
      order: String(banner.order ?? 0),
      isActive: banner.isActive,
    })
    setExistingImage(banner.image ?? null)
    setEditingId(banner.id)
    setShowModal(true)
  }

  const closeModal = () => {
    setIsClosing(true)
    setTimeout(() => {
      setShowModal(false)
      setIsClosing(false)
      resetForm()
    }, 250)
  }

  const handleImageSelect = (file: File | null) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setSelectedImage(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload = new FormData()
      payload.append('data', JSON.stringify(formData))
      if (selectedImage) payload.append('image', selectedImage)

      const response = await fetchApi(
        isEditMode
          ? `/api/admin/promotional-banners/${editingId}`
          : '/api/admin/promotional-banners',
        { method: isEditMode ? 'PATCH' : 'POST', body: payload }
      )

      if (response.ok) {
        const saved = await response.json()
        setBanners(prev =>
          isEditMode
            ? prev.map(b => (b.id === saved.id ? saved : b))
            : [...prev, saved]
        )
        setShowModal(false)
        resetForm()
        toast.success(
          isEditMode ? 'Banner Updated' : 'Banner Created',
          `"${saved.title}" has been ${isEditMode ? 'updated' : 'created'}.`
        )
      } else {
        const error = await response.json().catch(() => ({}))
        toast.error('Save Failed', error.error || 'Something went wrong.')
      }
    } catch (error) {
      console.error('Failed to save banner:', error)
      toast.error('Save Failed', 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (banner: Banner) => {
    if (!confirm(`Delete promotional banner "${banner.title}"?`)) return
    try {
      const response = await fetchApi(`/api/admin/promotional-banners/${banner.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setBanners(prev => prev.filter(b => b.id !== banner.id))
        toast.success('Banner Deleted', `"${banner.title}" has been deleted.`)
      } else {
        toast.error('Delete Failed', 'Could not delete banner.')
      }
    } catch (error) {
      console.error('Failed to delete banner:', error)
      toast.error('Delete Failed', 'An error occurred.')
    }
  }

  const toggleActive = async (banner: Banner) => {
    try {
      const payload = new FormData()
      payload.append('data', JSON.stringify({ isActive: !banner.isActive }))
      const response = await fetchApi(`/api/admin/promotional-banners/${banner.id}`, {
        method: 'PATCH',
        body: payload,
      })
      if (response.ok) {
        const saved = await response.json()
        setBanners(prev => prev.map(b => (b.id === saved.id ? saved : b)))
      }
    } catch (error) {
      console.error('Failed to toggle banner:', error)
    }
  }

  const sorted = [...banners].sort((a, b) => a.order - b.order)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading banners...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Promotional Banners</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage homepage promotional banners</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 font-medium shadow-lg shadow-red-500/25"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add Banner</span>
            </button>
          </div>
        </div>

        {/* List */}
        {sorted.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-100">
            <Megaphone className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No promotional banners</h3>
            <p className="text-gray-500 mb-6">Add a banner to feature on the homepage.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 transition-all duration-200 font-medium"
            >
              <Plus className="h-5 w-5" />
              Add Banner
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((banner) => (
              <div
                key={banner.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200"
              >
                <div className="flex gap-4 p-4">
                  {/* Image */}
                  <div className="flex-shrink-0">
                    {banner.image ? (
                      <Image
                        src={banner.image}
                        alt={banner.title}
                        width={112}
                        height={72}
                        className="h-[72px] w-28 rounded-lg object-cover ring-1 ring-gray-100"
                      />
                    ) : (
                      <div
                        className="h-[72px] w-28 rounded-lg flex items-center justify-center ring-1 ring-gray-100"
                        style={{ backgroundColor: banner.backgroundColor || '#f3f4f6' }}
                      >
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">{banner.title}</h3>
                          <span className="flex-shrink-0 text-xs text-gray-400">#{banner.order}</span>
                        </div>
                        {banner.description && (
                          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{banner.description}</p>
                        )}
                        {banner.link && (
                          <a
                            href={banner.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {banner.link}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 flex items-center justify-between">
                  <button
                    onClick={() => toggleActive(banner)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      banner.isActive ? 'text-green-700 hover:bg-green-100' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {banner.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(banner)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 active:scale-90"
                      title="Edit banner"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(banner)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 active:scale-90"
                      title="Delete banner"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Modal */}
        {showModal && (
          <div
            className={`fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-opacity duration-250 ${
              isClosing ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div className={`bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col ${
              isClosing ? 'animate-slide-down sm:animate-fade-out' : 'animate-slide-up sm:animate-fade-in'
            }`}>
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Banner' : 'Add Banner'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <form id="banner-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image</label>
                    <div className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                      imagePreview || existingImage ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null)}
                        className="hidden"
                        id="banner-image"
                      />
                      {imagePreview || existingImage ? (
                        <div>
                          <Image
                            src={imagePreview || existingImage || ''}
                            alt="Banner preview"
                            width={200}
                            height={120}
                            className="h-28 w-auto object-cover rounded-lg"
                          />
                          <label htmlFor="banner-image" className="mt-2 inline-block text-sm text-red-600 hover:text-red-700 cursor-pointer">
                            Change image
                          </label>
                        </div>
                      ) : (
                        <label htmlFor="banner-image" className="cursor-pointer flex flex-col items-center py-5">
                          <div className="p-3 bg-gray-100 rounded-xl mb-2">
                            <ImageIcon className="h-7 w-7 text-gray-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">Tap to upload image</span>
                          <span className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP • Max 5MB</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Summer Sale"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Short banner text..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Link */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Link</label>
                    <input
                      type="text"
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      placeholder="/products?sale=true"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  {/* Background color + order */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Background Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.backgroundColor || '#ffffff'}
                          onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                          className="h-12 w-14 rounded-lg border border-gray-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.backgroundColor}
                          onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                          placeholder="#FFF5E6"
                          className="flex-1 px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Order</label>
                      <input
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
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
                    <span className="text-sm text-gray-700">Active (shown on homepage)</span>
                  </div>
                </form>
              </div>

              <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/50">
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={closeModal}
                    className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="banner-form"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {isEditMode ? 'Saving...' : 'Creating...'}
                      </>
                    ) : (
                      isEditMode ? 'Save Changes' : 'Create Banner'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-down { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
        @keyframes fade-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fade-out { from { transform: scale(1); opacity: 1; } to { transform: scale(0.95); opacity: 0; } }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-down { animation: slide-down 0.25s cubic-bezier(0.4, 0, 1, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-out { animation: fade-out 0.2s cubic-bezier(0.4, 0, 1, 1) forwards; }
      `}</style>
    </div>
  )
}
