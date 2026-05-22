'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Plus, Edit, Trash2, X, ArrowLeft, Images, ImageIcon,
  ToggleLeft, ToggleRight
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

interface Slide {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  image: string
  ctaText: string | null
  ctaLink: string | null
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const emptyForm = {
  title: '',
  subtitle: '',
  description: '',
  ctaText: '',
  ctaLink: '',
  order: '0',
  isActive: true,
}

export default function HeroSlidesManagement() {
  const router = useRouter()
  const toast = useToast()
  const [slides, setSlides] = useState<Slide[]>([])
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

  const fetchSlides = useCallback(async () => {
    try {
      const response = await fetchApi('/api/admin/hero-slides')
      if (response.ok) {
        setSlides(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch hero slides:', error)
      toast.error('Failed to Load', 'Could not load hero slides.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSlides()
  }, [fetchSlides])

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

  const openEdit = (slide: Slide) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    setSelectedImage(null)
    setFormData({
      title: slide.title ?? '',
      subtitle: slide.subtitle ?? '',
      description: slide.description ?? '',
      ctaText: slide.ctaText ?? '',
      ctaLink: slide.ctaLink ?? '',
      order: String(slide.order ?? 0),
      isActive: slide.isActive,
    })
    setExistingImage(slide.image ?? null)
    setEditingId(slide.id)
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

    // A new slide must have an image (HeroSlide.image is required).
    if (!isEditMode && !selectedImage) {
      toast.error('Image Required', 'Please upload an image for the slide.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = new FormData()
      payload.append('data', JSON.stringify(formData))
      if (selectedImage) payload.append('image', selectedImage)

      const response = await fetchApi(
        isEditMode ? `/api/admin/hero-slides/${editingId}` : '/api/admin/hero-slides',
        { method: isEditMode ? 'PATCH' : 'POST', body: payload }
      )

      if (response.ok) {
        const saved = await response.json()
        setSlides(prev =>
          isEditMode
            ? prev.map(s => (s.id === saved.id ? saved : s))
            : [...prev, saved]
        )
        setShowModal(false)
        resetForm()
        toast.success(
          isEditMode ? 'Slide Updated' : 'Slide Created',
          `"${saved.title}" has been ${isEditMode ? 'updated' : 'created'}.`
        )
      } else {
        const error = await response.json().catch(() => ({}))
        toast.error('Save Failed', error.error || 'Something went wrong.')
      }
    } catch (error) {
      console.error('Failed to save slide:', error)
      toast.error('Save Failed', 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (slide: Slide) => {
    if (!confirm(`Delete hero slide "${slide.title}"?`)) return
    try {
      const response = await fetchApi(`/api/admin/hero-slides/${slide.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setSlides(prev => prev.filter(s => s.id !== slide.id))
        toast.success('Slide Deleted', `"${slide.title}" has been deleted.`)
      } else {
        toast.error('Delete Failed', 'Could not delete slide.')
      }
    } catch (error) {
      console.error('Failed to delete slide:', error)
      toast.error('Delete Failed', 'An error occurred.')
    }
  }

  const toggleActive = async (slide: Slide) => {
    try {
      const payload = new FormData()
      payload.append('data', JSON.stringify({ isActive: !slide.isActive }))
      const response = await fetchApi(`/api/admin/hero-slides/${slide.id}`, {
        method: 'PATCH',
        body: payload,
      })
      if (response.ok) {
        const saved = await response.json()
        setSlides(prev => prev.map(s => (s.id === saved.id ? saved : s)))
      }
    } catch (error) {
      console.error('Failed to toggle slide:', error)
    }
  }

  const sorted = [...slides].sort((a, b) => a.order - b.order)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading hero slides...</p>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Hero Slides</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Manage the homepage hero carousel
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 font-medium shadow-lg shadow-red-500/25"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add Slide</span>
            </button>
          </div>
          {sorted.length === 0 && (
            <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              No hero slides yet — the homepage hero falls back to product-based slides until you add some.
            </p>
          )}
        </div>

        {/* List */}
        {sorted.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-100">
            <Images className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hero slides</h3>
            <p className="text-gray-500 mb-6">Add a slide to control the homepage hero carousel.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 transition-all duration-200 font-medium"
            >
              <Plus className="h-5 w-5" />
              Add Slide
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((slide) => (
              <div
                key={slide.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200"
              >
                <div className="flex gap-4 p-4">
                  <div className="flex-shrink-0">
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      width={128}
                      height={72}
                      className="h-[72px] w-32 rounded-lg object-cover ring-1 ring-gray-100"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{slide.title}</h3>
                      <span className="flex-shrink-0 text-xs text-gray-400">#{slide.order}</span>
                    </div>
                    {slide.subtitle && (
                      <p className="text-sm text-gray-600 truncate mt-0.5">{slide.subtitle}</p>
                    )}
                    {slide.description && (
                      <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{slide.description}</p>
                    )}
                    {slide.ctaText && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {slide.ctaText} → {slide.ctaLink || '/'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 flex items-center justify-between">
                  <button
                    onClick={() => toggleActive(slide)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      slide.isActive ? 'text-green-700 hover:bg-green-100' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {slide.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    {slide.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(slide)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 active:scale-90"
                      title="Edit slide"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(slide)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 active:scale-90"
                      title="Delete slide"
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
                  {isEditMode ? 'Edit Hero Slide' : 'Add Hero Slide'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <form id="slide-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slide Image {isEditMode ? '' : '*'}
                    </label>
                    <div className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                      imagePreview || existingImage ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null)}
                        className="hidden"
                        id="slide-image"
                      />
                      {imagePreview || existingImage ? (
                        <div>
                          <Image
                            src={imagePreview || existingImage || ''}
                            alt="Slide preview"
                            width={240}
                            height={120}
                            className="h-28 w-auto object-cover rounded-lg"
                          />
                          <label htmlFor="slide-image" className="mt-2 inline-block text-sm text-red-600 hover:text-red-700 cursor-pointer">
                            Change image
                          </label>
                        </div>
                      ) : (
                        <label htmlFor="slide-image" className="cursor-pointer flex flex-col items-center py-5">
                          <div className="p-3 bg-gray-100 rounded-xl mb-2">
                            <ImageIcon className="h-7 w-7 text-gray-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">Tap to upload image</span>
                          <span className="text-xs text-gray-500 mt-1">Wide image works best • JPEG, PNG, WebP • Max 5MB</span>
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
                      placeholder="e.g., Exquisite Silk Sarees"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  {/* Subtitle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Subtitle</label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="e.g., Handcrafted with Love"
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
                      placeholder="Short slide text..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* CTA */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Button Text</label>
                      <input
                        type="text"
                        value={formData.ctaText}
                        onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                        placeholder="Shop Now"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Button Link</label>
                      <input
                        type="text"
                        value={formData.ctaLink}
                        onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                        placeholder="/products"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Order */}
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
                    form="slide-form"
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
                      isEditMode ? 'Save Changes' : 'Create Slide'
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
