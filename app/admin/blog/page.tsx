'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Plus, Edit, Trash2, X, ArrowLeft, BookOpen, ImageIcon,
  ToggleLeft, ToggleRight, Star, Clock, Eye, EyeOff
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { HoldToDeleteDialog } from '@/components/admin/hold-to-delete-dialog'
import { renderMarkdown } from '@/lib/markdown'
import { compressImage, formatBytes } from '@/lib/image-compress'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  image: string | null
  authorName: string | null
  readMinutes: number
  isPublished: boolean
  isFeatured: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  category: '',
  authorName: '',
  isPublished: false,
  isFeatured: false,
}

const MARKDOWN_HINT =
  'Markdown supported — # Heading, **bold**, _italic_, [link](https://…), - list item, > quote, `code`.'

/** URL-safe slug from a title. Mirrors what a reader would type. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function BlogManagement() {
  const router = useRouter()
  const toast = useToast()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Null until a file has been picked; `busy` covers the re-encode itself.
  const [imageCompression, setImageCompression] = useState<{
    busy: boolean
    originalBytes: number
    compressedBytes: number
  } | null>(null)
  // Once the admin types a slug themselves, the title stops driving it.
  const [slugTouched, setSlugTouched] = useState(false)

  const isEditMode = editingId !== null
  const compressing = imageCompression?.busy === true

  const fetchPosts = useCallback(async () => {
    try {
      const response = await fetchApi('/api/admin/blog')
      if (response.ok) {
        setPosts(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch blog posts:', error)
      toast.error('Failed to Load', 'Could not load blog posts.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

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
    setImageCompression(null)
    setEditingId(null)
    setFormData(emptyForm)
    setSlugTouched(false)
    setShowPreview(false)
  }

  const openCreate = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (post: BlogPost) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    setSelectedImage(null)
    setImageCompression(null)
    setShowPreview(false)
    setFormData({
      title: post.title ?? '',
      slug: post.slug ?? '',
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      category: post.category ?? '',
      authorName: post.authorName ?? '',
      isPublished: post.isPublished,
      isFeatured: post.isFeatured,
    })
    // A published post's slug is a live URL that may already be linked to, so
    // it is never regenerated from the title — only an explicit edit changes it.
    setSlugTouched(true)
    setExistingImage(post.image ?? null)
    setEditingId(post.id)
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

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      ...(!isEditMode && !slugTouched && { slug: slugify(title) }),
    }))
  }

  const handleImageSelect = async (file: File | null) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)

    if (!file) {
      setSelectedImage(null)
      setImageCompression(null)
      return
    }

    setImageCompression({ busy: true, originalBytes: file.size, compressedBytes: 0 })

    // Vercel caps a serverless request body at 4.5MB and a raw phone photo is
    // 4-8MB on its own, so the multipart POST would be rejected at the edge
    // with a 413 before the route handler ever runs. Re-encode in the browser
    // first, and preview the file we are actually going to upload.
    const compressed = await compressImage(file)

    setSelectedImage(compressed)
    setImagePreview(URL.createObjectURL(compressed))
    setImageCompression({
      busy: false,
      originalBytes: file.size,
      compressedBytes: compressed.size,
    })
  }

  // An oversized body is rejected at the edge with a non-JSON 413, so read
  // defensively and translate it into something an admin can act on.
  const readErrorMessage = async (response: Response, fallback: string) => {
    if (response.status === 413) {
      return 'The upload was too large for the server. Please pick a smaller cover image.'
    }
    const body = await response.json().catch(() => ({}))
    return body.error || fallback
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (compressing) return

    const slug = slugify(formData.slug)
    if (!slug) {
      toast.error('Slug Required', 'Give the post a URL slug, e.g. "handloom-silk-guide".')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = new FormData()
      payload.append('data', JSON.stringify({ ...formData, slug }))
      if (selectedImage) payload.append('image', selectedImage)

      const response = await fetchApi(
        isEditMode ? `/api/admin/blog/${editingId}` : '/api/admin/blog',
        { method: isEditMode ? 'PATCH' : 'POST', body: payload }
      )

      if (response.ok) {
        const saved: BlogPost = await response.json()
        setPosts(prev =>
          isEditMode
            ? prev.map(p => (p.id === saved.id ? saved : p))
            : [saved, ...prev]
        )
        setShowModal(false)
        resetForm()
        toast.success(
          isEditMode ? 'Post Updated' : 'Post Created',
          `"${saved.title}" has been ${isEditMode ? 'updated' : 'created'}.`
        )
      } else {
        toast.error('Save Failed', await readErrorMessage(response, 'Something went wrong.'))
      }
    } catch (error) {
      console.error('Failed to save blog post:', error)
      toast.error('Save Failed', 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const { id, title } = deleteTarget

    setDeleting(true)
    try {
      const response = await fetchApi(`/api/admin/blog/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setPosts(prev => prev.filter(p => p.id !== id))
        toast.success('Post Deleted', `"${title}" has been deleted.`)
        setDeleteTarget(null)
      } else {
        // Keep the dialog open so the admin can retry or back out.
        toast.error('Delete Failed', 'Could not delete blog post.')
      }
    } catch (error) {
      console.error('Failed to delete blog post:', error)
      toast.error('Delete Failed', 'An error occurred.')
    } finally {
      setDeleting(false)
    }
  }

  const togglePublished = async (post: BlogPost) => {
    try {
      const payload = new FormData()
      payload.append('data', JSON.stringify({ isPublished: !post.isPublished }))
      const response = await fetchApi(`/api/admin/blog/${post.id}`, {
        method: 'PATCH',
        body: payload,
      })
      if (response.ok) {
        const saved: BlogPost = await response.json()
        setPosts(prev => prev.map(p => (p.id === saved.id ? saved : p)))
        toast.success(
          saved.isPublished ? 'Post Published' : 'Post Unpublished',
          saved.isPublished
            ? `"${saved.title}" is now live on the blog.`
            : `"${saved.title}" is back to draft.`
        )
      } else {
        toast.error('Update Failed', 'Could not change the publish state.')
      }
    } catch (error) {
      console.error('Failed to toggle blog post:', error)
      toast.error('Update Failed', 'An error occurred.')
    }
  }

  // Same ordering the API applies, so a post saved here lands where a refetch
  // would put it. Drafts have no publishedAt, so they fall back to createdAt.
  const sorted = [...posts].sort(
    (a, b) =>
      new Date(b.publishedAt ?? b.createdAt).getTime() -
      new Date(a.publishedAt ?? a.createdAt).getTime()
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading blog posts...</p>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Blog</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Write and publish stories for the storefront blog
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 font-medium shadow-lg shadow-red-500/25"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">New Post</span>
            </button>
          </div>
        </div>

        {/* List */}
        {sorted.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-100">
            <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No blog posts</h3>
            <p className="text-gray-500 mb-6">Write your first post to fill out the blog page.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 transition-all duration-200 font-medium"
            >
              <Plus className="h-5 w-5" />
              New Post
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200"
              >
                <div className="flex gap-4 p-4">
                  <div className="flex-shrink-0">
                    {post.image ? (
                      <Image
                        src={post.image}
                        alt={post.title}
                        width={128}
                        height={72}
                        className="h-[72px] w-32 rounded-lg object-cover ring-1 ring-gray-100"
                      />
                    ) : (
                      <div className="h-[72px] w-32 rounded-lg bg-gray-100 ring-1 ring-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{post.title}</h3>
                      {post.isFeatured && (
                        <Star
                          className="h-4 w-4 flex-shrink-0 text-amber-500 fill-amber-400"
                          aria-label="Featured post"
                        />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{post.excerpt}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          post.isPublished
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {post.isPublished ? 'Published' : 'Draft'}
                      </span>
                      {post.category && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {post.category}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {post.readMinutes} min read
                      </span>
                      <span className="text-xs text-gray-400">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString()
                          : 'Not published yet'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 flex items-center justify-between">
                  <button
                    onClick={() => togglePublished(post)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      post.isPublished ? 'text-green-700 hover:bg-green-100' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {post.isPublished ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    {post.isPublished ? 'Published' : 'Draft'}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(post)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 active:scale-90"
                      title="Edit post"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(post)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 active:scale-90"
                      title="Delete post"
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
            <div className={`bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col ${
              isClosing ? 'animate-slide-down sm:animate-fade-out' : 'animate-slide-up sm:animate-fade-in'
            }`}>
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Blog Post' : 'New Blog Post'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <form id="blog-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Cover image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
                    <div className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                      imagePreview || existingImage ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleImageSelect(e.target.files?.[0] ?? null)}
                        className="hidden"
                        id="blog-image"
                      />
                      {compressing ? (
                        <div className="flex flex-col items-center py-6">
                          <svg className="animate-spin h-6 w-6 text-red-500 mb-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-700">Optimising image…</span>
                        </div>
                      ) : imagePreview || existingImage ? (
                        <div>
                          <Image
                            src={imagePreview || existingImage || ''}
                            alt="Cover preview"
                            width={240}
                            height={120}
                            className="h-28 w-auto object-cover rounded-lg"
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <label htmlFor="blog-image" className="text-sm text-red-600 hover:text-red-700 cursor-pointer">
                              Change image
                            </label>
                            {imageCompression && imageCompression.compressedBytes > 0 && (
                              <span className="text-xs text-gray-500">
                                Optimised to {formatBytes(imageCompression.compressedBytes)}
                                {imageCompression.compressedBytes < imageCompression.originalBytes &&
                                  ` from ${formatBytes(imageCompression.originalBytes)}`}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <label htmlFor="blog-image" className="cursor-pointer flex flex-col items-center py-5">
                          <div className="p-3 bg-gray-100 rounded-xl mb-2">
                            <ImageIcon className="h-7 w-7 text-gray-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">Tap to upload cover image</span>
                          <span className="text-xs text-gray-500 mt-1">Wide image works best • JPEG, PNG, WebP</span>
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
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="e.g., How to Care for a Kanjivaram Silk Saree"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">URL Slug *</label>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => {
                        setSlugTouched(true)
                        setFormData({ ...formData, slug: e.target.value })
                      }}
                      placeholder="kanjivaram-silk-care"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Post will live at /blog/{formData.slug || 'your-slug'}
                      {isEditMode && ' — changing it breaks any existing links.'}
                    </p>
                  </div>

                  {/* Excerpt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Excerpt *</label>
                    <textarea
                      required
                      rows={3}
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="One or two lines shown on the blog index and in link previews..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Category + Author */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                      <input
                        type="text"
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Culture & Heritage"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Author</label>
                      <input
                        type="text"
                        value={formData.authorName}
                        onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                        placeholder="e.g., Saakie Team"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-gray-700">Content *</label>
                      <button
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {showPreview ? 'Edit' : 'Preview'}
                      </button>
                    </div>
                    {showPreview ? (
                      formData.content.trim() ? (
                        <div
                          className="blog-md-preview px-4 py-3 border border-gray-200 rounded-xl bg-white min-h-[16rem] max-h-[24rem] overflow-y-auto"
                          // Safe by construction: renderMarkdown escapes the source
                          // before emitting any tag — see lib/markdown.ts.
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(formData.content) }}
                        />
                      ) : (
                        <div className="px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 min-h-[16rem] flex items-center justify-center text-sm text-gray-400">
                          Nothing to preview yet.
                        </div>
                      )
                    ) : (
                      <textarea
                        required
                        rows={14}
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        placeholder={'# A heading\n\nWrite the post body here...'}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm leading-relaxed"
                      />
                    )}
                    <p className="mt-1.5 text-xs text-gray-500">{MARKDOWN_HINT}</p>
                  </div>

                  {/* Publish + Feature toggles */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isPublished: !formData.isPublished })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          formData.isPublished ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          formData.isPublished ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className="text-sm text-gray-700">Published (visible on /blog)</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
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
                      <span className="text-sm text-gray-700">Featured (highlighted on the blog index)</span>
                    </div>
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
                    form="blog-form"
                    disabled={isSubmitting || compressing}
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
                    ) : compressing ? (
                      'Optimising image…'
                    ) : (
                      isEditMode ? 'Save Changes' : 'Create Post'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <HoldToDeleteDialog
        open={deleteTarget !== null}
        itemName={deleteTarget?.title ?? ''}
        description="This permanently removes the post and its cover image. Any link pointing at it will 404. This cannot be undone."
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <style jsx>{`
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slide-down { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
        @keyframes fade-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fade-out { from { transform: scale(1); opacity: 1; } to { transform: scale(0.95); opacity: 0; } }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-down { animation: slide-down 0.25s cubic-bezier(0.4, 0, 1, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-out { animation: fade-out 0.2s cubic-bezier(0.4, 0, 1, 1) forwards; }

        /* The preview body comes from dangerouslySetInnerHTML, so styled-jsx
           cannot tag those nodes — :global() reaches them, still scoped to the
           preview panel. Tailwind's typography plugin is not installed here. */
        .blog-md-preview :global(h1) { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 1.25rem 0 0.75rem; }
        .blog-md-preview :global(h2) { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 1.25rem 0 0.5rem; }
        .blog-md-preview :global(h3) { font-size: 1.05rem; font-weight: 600; color: #1f2937; margin: 1rem 0 0.5rem; }
        .blog-md-preview :global(h1:first-child),
        .blog-md-preview :global(h2:first-child),
        .blog-md-preview :global(h3:first-child) { margin-top: 0; }
        .blog-md-preview :global(p) { color: #374151; line-height: 1.7; margin: 0.75rem 0; }
        .blog-md-preview :global(a) { color: #dc2626; text-decoration: underline; }
        .blog-md-preview :global(ul),
        .blog-md-preview :global(ol) { margin: 0.75rem 0; padding-left: 1.5rem; color: #374151; }
        .blog-md-preview :global(ul) { list-style: disc; }
        .blog-md-preview :global(ol) { list-style: decimal; }
        .blog-md-preview :global(li) { margin: 0.25rem 0; line-height: 1.6; }
        .blog-md-preview :global(blockquote) { border-left: 3px solid #fca5a5; padding-left: 1rem; margin: 1rem 0; color: #6b7280; font-style: italic; }
        .blog-md-preview :global(code) { background: #f3f4f6; padding: 0.1rem 0.35rem; border-radius: 0.25rem; font-size: 0.85em; font-family: ui-monospace, SFMono-Regular, monospace; }
        .blog-md-preview :global(pre) { background: #f3f4f6; padding: 0.85rem; border-radius: 0.5rem; overflow-x: auto; margin: 1rem 0; }
        .blog-md-preview :global(pre code) { background: none; padding: 0; }
        .blog-md-preview :global(hr) { border: 0; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
        .blog-md-preview :global(img) { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; }
        .blog-md-preview :global(strong) { font-weight: 700; color: #111827; }
        .blog-md-preview :global(em) { font-style: italic; }
      `}</style>
    </div>
  )
}
