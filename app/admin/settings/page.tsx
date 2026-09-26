'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Settings, Truck, Loader2, Clock } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from '@/lib/shipping'
import { formatPrice, cn } from '@/lib/utils'

interface StoreSettings {
  shippingEnabled: boolean
  updatedAt: string | null
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

/** Accessible on/off switch. Native-button based so it works with keyboard and screen readers. */
function Switch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
        checked ? 'bg-green-500' : 'bg-gray-300',
        disabled && 'opacity-60 cursor-not-allowed'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

export default function StoreSettingsPage() {
  const router = useRouter()
  const toast = useToast()
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetchApi('/api/admin/settings')
      if (response.ok) {
        setSettings(await response.json())
      } else {
        toast.error('Failed to Load', 'Could not load store settings.')
      }
    } catch (error) {
      console.error('Failed to fetch store settings:', error)
      toast.error('Failed to Load', 'Could not load store settings.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Saves on the flip itself — one switch, no separate Save button to forget.
  // The UI moves first and rolls back if the request fails.
  const setShippingEnabled = async (shippingEnabled: boolean) => {
    if (!settings || saving) return
    const previous = settings
    setSettings({ ...settings, shippingEnabled })
    setSaving(true)
    try {
      const response = await fetchApi('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingEnabled }),
      })
      if (response.ok) {
        setSettings(await response.json())
        toast.success(
          shippingEnabled ? 'Shipping Fee On' : 'Shipping Fee Off',
          shippingEnabled
            ? `${formatPrice(SHIPPING_FEE)} on orders up to ${formatPrice(FREE_SHIPPING_THRESHOLD)}; free above.`
            : 'Every order now ships free.'
        )
      } else {
        setSettings(previous)
        toast.error('Update Failed', 'Could not save the setting.')
      }
    } catch (error) {
      console.error('Failed to update store settings:', error)
      setSettings(previous)
      toast.error('Update Failed', 'An error occurred.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading settings…</p>
        </div>
      </div>
    )
  }

  const shippingEnabled = settings?.shippingEnabled ?? true

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
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
            <div className="p-2 rounded-lg bg-gray-900 text-white">
              <Settings className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Store Settings</h1>
          </div>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Store-wide switches. Changes apply to the next cart or checkout page load — no deploy needed.
          </p>
        </div>

        {/* Shipping */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Truck className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Shipping</h2>
          </div>

          <div className="px-5 py-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <label className="block font-medium text-gray-900">Charge shipping fee</label>
              <p className="text-sm text-gray-600 mt-1">
                {shippingEnabled ? (
                  <>
                    <span className="font-medium text-gray-900">On</span> — {formatPrice(SHIPPING_FEE)} shipping on orders up to{' '}
                    {formatPrice(FREE_SHIPPING_THRESHOLD)}; free above that.
                  </>
                ) : (
                  <>
                    <span className="font-medium text-gray-900">Off</span> — shipping is free on every order, whatever the subtotal.
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Applies to new orders only. Orders already placed keep the shipping they were charged.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              <Switch
                checked={shippingEnabled}
                disabled={saving}
                onChange={setShippingEnabled}
                label="Charge shipping fee"
              />
            </div>
          </div>

          {settings?.updatedAt && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              Last changed {formatDateTime(settings.updatedAt)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
