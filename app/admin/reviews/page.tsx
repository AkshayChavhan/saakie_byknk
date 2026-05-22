'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Star, Check, X, Trash2, MessageSquare, BadgeCheck, Clock
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  isVerified: boolean
  status: ReviewStatus
  createdAt: string
  user: { name: string | null; email: string }
  product: { name: string; slug: string }
}

const STATUS_STYLES: Record<ReviewStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

export default function ReviewsModeration() {
  const router = useRouter()
  const toast = useToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('all')
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (ratingFilter !== 'all') params.set('rating', ratingFilter)
      const response = await fetchApi(`/api/admin/reviews?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews ?? [])
        setPendingCount(data.pendingCount ?? 0)
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
      toast.error('Failed to Load', 'Could not load reviews.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, ratingFilter, toast])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const setStatus = async (review: Review, status: ReviewStatus) => {
    setBusyId(review.id)
    try {
      const response = await fetchApi(`/api/admin/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (response.ok) {
        const updated = await response.json()
        setReviews(prev => prev.map(r => (r.id === updated.id ? updated : r)))
        setPendingCount(prev =>
          review.status === 'PENDING' && status !== 'PENDING' ? Math.max(0, prev - 1) : prev
        )
        toast.success('Review Updated', `Review ${status.toLowerCase()}.`)
      } else {
        toast.error('Update Failed', 'Could not update the review.')
      }
    } catch (error) {
      console.error('Failed to update review:', error)
      toast.error('Update Failed', 'An error occurred.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (review: Review) => {
    if (!confirm('Delete this review permanently?')) return
    setBusyId(review.id)
    try {
      const response = await fetchApi(`/api/admin/reviews/${review.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setReviews(prev => prev.filter(r => r.id !== review.id))
        if (review.status === 'PENDING') setPendingCount(prev => Math.max(0, prev - 1))
        toast.success('Review Deleted', 'The review has been removed.')
      } else {
        toast.error('Delete Failed', 'Could not delete the review.')
      }
    } catch (error) {
      console.error('Failed to delete review:', error)
      toast.error('Delete Failed', 'An error occurred.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reviews...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Review Moderation</h1>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                <Clock className="h-3.5 w-3.5" />
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Approve, reject, or remove customer reviews
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100 flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | ReviewStatus)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white cursor-pointer"
          >
            <option value="all">All Ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-100">
            <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-500">
              {statusFilter !== 'all' || ratingFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Customer reviews will appear here for moderation.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={15}
                              className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                            />
                          ))}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[review.status]}`}>
                          {review.status}
                        </span>
                        {review.isVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                            <BadgeCheck className="h-3 w-3" />
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      {review.title && (
                        <h3 className="font-semibold text-gray-900 mt-2">{review.title}</h3>
                      )}
                      {review.comment && (
                        <p className="text-sm text-gray-700 mt-1">{review.comment}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {review.user.name || review.user.email} ·{' '}
                        <span className="text-gray-700">{review.product.name}</span> ·{' '}
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 flex items-center justify-end gap-2">
                  {review.status !== 'APPROVED' && (
                    <button
                      onClick={() => setStatus(review, 'APPROVED')}
                      disabled={busyId === review.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                  )}
                  {review.status !== 'REJECTED' && (
                    <button
                      onClick={() => setStatus(review, 'REJECTED')}
                      disabled={busyId === review.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(review)}
                    disabled={busyId === review.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
