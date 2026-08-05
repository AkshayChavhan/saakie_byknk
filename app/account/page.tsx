'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import {
  User,
  Package,
  Heart,
  LogOut,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  Pencil,
  Camera,
  Star,
  Loader2,
  Trash2,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { formatPrice, formatDate, cn } from '@/lib/utils'
import {
  ORDER_STATUS_STYLES as STATUS_STYLES,
  statusLabel,
  getOrderRemoval,
} from '@/lib/orders'
import { orderApi, userApi, reviewApi } from '@/lib/api'
import { compressImage, formatBytes } from '@/lib/image-compress'

/** How long the row spends fading out before it is dropped from the list. */
const ORDER_EXIT_MS = 220

interface OrderItemSummary {
  id: string
  quantity: number
  product: {
    name: string
    slug: string
    images: { url: string; alt: string | null }[]
  } | null
}

interface OrderSummary {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  createdAt: string
  items: OrderItemSummary[]
}

interface MyReview {
  id: string
  rating: number
  title: string | null
  comment: string | null
  status: string
  createdAt: string
  product: { id: string; name: string; slug: string; image: string } | null
}

interface Profile {
  name: string | null
  email: string | null
  phone: string | null
  imageUrl: string | null
}


export default function AccountPage() {
  const { data: session, status, update } = useSession()
  const isLoaded = status !== 'loading'
  const isSignedIn = status === 'authenticated'
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN'

  const toast = useToast()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [reviews, setReviews] = useState<MyReview[]>([])
  const [loading, setLoading] = useState(true)

  // Removing an order: the one awaiting confirmation, the request in flight,
  // and the row currently playing its fade-out.
  const [removeTarget, setRemoveTarget] = useState<OrderSummary | null>(null)
  const [removing, setRemoving] = useState(false)
  const [exitingId, setExitingId] = useState<string | null>(null)

  // Edit-profile state
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Null until a photo has been picked; `busy` covers the re-encode itself.
  const [imageCompression, setImageCompression] = useState<{
    busy: boolean
    originalBytes: number
    compressedBytes: number
  } | null>(null)

  const compressing = imageCompression?.busy === true

  const loadAll = useCallback(async () => {
    try {
      const [prof, ords, revs] = await Promise.all([
        userApi.getProfile().catch(() => null),
        orderApi.list().catch(() => []),
        reviewApi.mine().catch(() => []),
      ])
      if (prof) {
        setProfile(prof)
        setForm({ name: prof.name || '', phone: prof.phone || '' })
      }
      setOrders(Array.isArray(ords) ? ords : [])
      setReviews(Array.isArray(revs) ? revs : [])
    } catch (error) {
      console.error('Error loading account:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isSignedIn) loadAll()
    else if (isLoaded) setLoading(false)
  }, [isLoaded, isSignedIn, loadAll])

  // Held so an in-flight fade-out can be abandoned if the page goes away.
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (exitTimer.current) clearTimeout(exitTimer.current)
    },
    []
  )

  const confirmRemoveOrder = async () => {
    if (!removeTarget) return
    const { id, orderNumber } = removeTarget

    setRemoving(true)
    try {
      const result = await orderApi.remove(id)

      // Dismiss the dialog first, then let the row fade on its own — a row
      // disappearing while the dialog is still over it reads as a glitch.
      setRemoveTarget(null)
      setExitingId(id)
      exitTimer.current = setTimeout(() => {
        setOrders((prev) => prev.filter((order) => order.id !== id))
        setExitingId(null)
        exitTimer.current = null
      }, ORDER_EXIT_MS)

      toast.success(
        result.cancelled ? 'Order cancelled' : 'Order removed',
        result.cancelled
          ? `#${orderNumber} has been cancelled and taken off your list.`
          : `#${orderNumber} is no longer on your list.`
      )
    } catch (error) {
      // The server has the last word: the order may have been paid or
      // dispatched since this page loaded, in which case it explains why it
      // said no. Reload so the row shows its real status rather than the stale
      // one that made the button appear.
      setRemoveTarget(null)
      toast.error(
        "Couldn't remove that order",
        error instanceof Error ? error.message : 'Please try again.'
      )
      loadAll()
    } finally {
      setRemoving(false)
    }
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return

    // The photo can be re-picked as many times as the user likes, so release
    // the previous preview before a new one replaces it.
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setImageCompression({ busy: true, originalBytes: f.size, compressedBytes: 0 })

    // Vercel caps a serverless request body at 4.5MB and a raw phone photo is
    // 4-8MB on its own, so the multipart PATCH would be rejected at the edge
    // with a 413 before the route handler ever runs. Re-encode in the browser
    // first, and preview the file we are actually going to upload.
    const compressed = await compressImage(f)

    setFile(compressed)
    setPreviewUrl(URL.createObjectURL(compressed))
    setImageCompression({
      busy: false,
      originalBytes: f.size,
      compressedBytes: compressed.size,
    })
  }

  const saveProfile = async () => {
    if (compressing) return
    setSaving(true)
    setEditError(null)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('phone', form.phone)
      if (file) fd.append('image', file)
      const updated: Profile = await userApi.updateProfile(fd)
      setProfile(updated)
      // Reflect name/image in the active session immediately (no re-login).
      await update({ name: updated.name, image: updated.imageUrl })
      setEditing(false)
      setFile(null)
      setPreviewUrl(null)
      setImageCompression(null)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <User className="h-12 w-12 text-gray-300" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Please sign in</h1>
          <p className="mt-2 text-sm text-gray-500">Sign in to view your account and orders.</p>
          <Link href="/sign-in" className="btn-primary mt-6">Sign In</Link>
        </main>
      </div>
    )
  }

  const displayName = profile?.name || session?.user?.name || 'My Account'
  const email = profile?.email || session?.user?.email || ''
  const avatar = previewUrl || profile?.imageUrl || session?.user?.image || null

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-6 sm:px-8 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">My Account</h1>

        {/* Profile card */}
        <div className="card p-5 mb-6">
          {!editing ? (
            <div className="flex items-center gap-4">
              <Avatar src={avatar} name={displayName} />
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-gray-900 truncate">{displayName}</p>
                {email && <p className="text-sm text-gray-500 truncate">{email}</p>}
                {profile?.phone && <p className="text-sm text-gray-500 truncate">{profile.phone}</p>}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={15} />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              {editError && (
                <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {editError}
                </div>
              )}
              <div className="flex items-start gap-4">
                {/* Avatar with upload overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative shrink-0 rounded-full"
                  aria-label="Change profile photo"
                >
                  <Avatar src={avatar} name={displayName} />
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity">
                    <Camera size={18} />
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPickFile}
                />

                <div className="flex-1 space-y-3">
                  <div>
                    <label className="label">Name</label>
                    <input
                      className="input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input
                      className="input"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="10-digit phone"
                    />
                  </div>
                  <p className="text-xs text-gray-400">Tap the photo to change your profile picture (JPG/PNG/WebP, ≤5MB).</p>
                  {compressing ? (
                    <p className="text-xs text-gray-500">Optimising image…</p>
                  ) : imageCompression && imageCompression.compressedBytes > 0 ? (
                    <p className="text-xs text-gray-500">
                      Optimised to {formatBytes(imageCompression.compressedBytes)}
                      {imageCompression.compressedBytes < imageCompression.originalBytes &&
                        ` from ${formatBytes(imageCompression.originalBytes)}`}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={saveProfile}
                  disabled={saving || compressing}
                  className="btn-primary disabled:opacity-60 flex items-center gap-2"
                >
                  {(saving || compressing) && <Loader2 size={15} className="animate-spin" />}
                  {compressing ? 'Optimising image…' : 'Save changes'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setFile(null)
                    setPreviewUrl(null)
                    setImageCompression(null)
                    setEditError(null)
                    setForm({ name: profile?.name || '', phone: profile?.phone || '' })
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <Link href="/wishlist" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <Heart className="h-5 w-5 text-rose-500" />
            <span className="flex-1 text-sm font-medium text-gray-900">My Wishlist</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
          <Link href="/products" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <ShoppingBag className="h-5 w-5 text-gray-700" />
            <span className="flex-1 text-sm font-medium text-gray-900">Continue Shopping</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
          {isAdmin && (
            <Link href="/admin" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <ShieldCheck className="h-5 w-5 text-gray-700" />
              <span className="flex-1 text-sm font-medium text-gray-900">Admin Dashboard</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Link>
          )}
        </div>

        {/* Orders */}
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">My Orders</h2>
        </div>

        {loading ? (
          <div className="space-y-3 mb-8">
            {[0, 1].map((i) => (
              <div key={i} className="card p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-8 text-center mb-8">
            <Package className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="mt-3 text-sm text-gray-600">You haven&apos;t placed any orders yet.</p>
            <Link href="/products" className="btn-primary mt-5 inline-block">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {orders.map((order) => {
              const firstImage = order.items?.[0]?.product?.images?.[0]?.url
              // Same rule the API enforces, so the button is only ever offered
              // for an order the server will actually let go.
              const { canRemove } = getOrderRemoval(order)
              const isExiting = exitingId === order.id
              return (
                <div
                  key={order.id}
                  className={cn(
                    'card relative p-4 sm:p-5 transition-all duration-200 ease-out motion-reduce:transition-none',
                    isExiting
                      ? 'pointer-events-none -translate-x-3 scale-[0.98] opacity-0'
                      : 'opacity-100 hover:shadow-md'
                  )}
                >
                  {/* The whole card opens the order. It is laid over the
                      content rather than wrapped around it so the remove
                      button can be a real <button> — nesting one inside a link
                      is invalid and breaks keyboard activation. */}
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                  >
                    <span className="sr-only">View order {order.orderNumber}</span>
                  </Link>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-medium',
                          STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {statusLabel(order.status)}
                      </span>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(order)}
                          aria-label={`Remove order ${order.orderNumber} from your list`}
                          className="relative z-20 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    {firstImage && (
                      <Image
                        src={firstImage}
                        alt={order.items[0]?.product?.name || 'Product'}
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-md object-cover bg-gray-100"
                      />
                    )}
                    <p className="flex-1 text-sm text-gray-600 truncate">
                      {order.items?.[0]?.product?.name}
                      {order.items?.length > 1 && ` + ${order.items.length - 1} more`}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">{formatPrice(order.total)}</p>
                    <ChevronRight size={18} className="shrink-0 text-gray-400" />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* My Reviews */}
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">My Reviews</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="card p-5 animate-pulse h-20" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="card p-8 text-center">
            <Star className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="mt-3 text-sm text-gray-600">You haven&apos;t written any reviews yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((rev) => (
              <div key={rev.id} className="card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  {rev.product?.image && (
                    <Image
                      src={rev.product.image}
                      alt={rev.product.name}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-md object-cover bg-gray-100 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {rev.product ? (
                      <Link href={`/products/${rev.product.slug}`} className="text-sm font-medium text-gray-900 hover:underline truncate block">
                        {rev.product.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-gray-500">Product unavailable</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Stars value={rev.rating} />
                      <span className="text-xs text-gray-400">{formatDate(rev.createdAt)}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-medium',
                          STATUS_STYLES[rev.status] || 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {statusLabel(rev.status)}
                      </span>
                    </div>
                    {rev.title && <p className="mt-2 text-sm font-medium text-gray-900">{rev.title}</p>}
                    {rev.comment && <p className="text-sm text-gray-600">{rev.comment}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={removeTarget !== null}
        title={
          removeTarget
            ? `Remove order #${removeTarget.orderNumber} from your list?`
            : ''
        }
        description={
          removeTarget && getOrderRemoval(removeTarget).cancelFirst
            ? 'This cancels the order and takes it off your list. You have not been charged, so there is nothing to refund.'
            : 'This takes the order off your list. Nothing else about it changes.'
        }
        confirmLabel="Yes, remove"
        cancelLabel="Keep it"
        busyLabel="Removing…"
        busy={removing}
        onConfirm={confirmRemoveOrder}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) {
    // Local object-URL previews (blob:) can't go through the Next image
    // optimizer — render those unoptimized; remote URLs use the optimizer.
    const isLocalPreview = src.startsWith('blob:') || src.startsWith('data:')
    return (
      <Image
        src={src}
        alt={name}
        width={56}
        height={56}
        unoptimized={isLocalPreview}
        className="h-14 w-14 rounded-full object-cover bg-gray-100"
      />
    )
  }
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white">
      <User size={26} />
    </div>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}
        />
      ))}
    </span>
  )
}
