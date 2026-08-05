'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Banknote, Loader2, Settings, ToggleLeft, ToggleRight } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

interface StoreSettings {
  codEnabled: boolean
}

export default function StoreSettingsManagement() {
  const { data: session, status } = useSession()
  const role = session?.user?.role
  // A store-wide payment kill switch is worth gating in the UI too, not just in
  // the API — see the dashboard's own check.
  const authorized = role === 'ADMIN' || role === 'SUPER_ADMIN'

  const toast = useToast()
  // ToastProvider builds its context value inline, so `toast` gets a new
  // identity every time a toast is shown. Depending on it directly would make
  // the loader below re-run on its own error toast — a fetch loop. Read it
  // through a ref so the effect depends on nothing that a toast can change.
  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetchApi('/api/admin/settings')
      if (response.ok) {
        setSettings(await response.json())
      } else {
        toastRef.current.error('Failed to Load', 'Could not load store settings.')
      }
    } catch (error) {
      console.error('Failed to fetch store settings:', error)
      toastRef.current.error('Failed to Load', 'Could not load store settings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authorized) fetchSettings()
    else if (status !== 'loading') setLoading(false)
  }, [authorized, status, fetchSettings])

  const setCodEnabled = async (codEnabled: boolean) => {
    setSaving(true)
    try {
      const response = await fetchApi('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codEnabled }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(typeof data.error === 'string' ? data.error : 'Could not save')
      }
      setSettings(await response.json())
      toast.success(
        codEnabled ? 'COD Enabled' : 'COD Disabled',
        codEnabled
          ? 'Shoppers can now choose Cash on Delivery, where the product allows it.'
          : 'Cash on Delivery is now hidden at checkout and rejected on the server.'
      )
    } catch (error) {
      console.error('Failed to save store settings:', error)
      toast.error('Save Failed', error instanceof Error ? error.message : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to manage store settings.</p>
          <Link href="/" className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  // `settings === null` means the read failed. Never render a guess as fact on
  // a payment kill switch — say so and disable the control instead.
  const loadFailed = settings === null
  const codEnabled = settings?.codEnabled ?? true

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>

        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <Banknote className="h-6 w-6 text-gray-700 shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900">Cash on Delivery</h2>
              <p className="text-sm text-gray-600 mt-1">
                Turn Cash on Delivery on or off for the whole store. When off, COD is hidden at
                checkout and rejected by the order API, even for products that list COD in their
                own payment modes. Orders already placed are unaffected.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Individual products still opt in separately under Manage Products → Payment modes.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={codEnabled}
              aria-label="Cash on Delivery"
              disabled={saving || loadFailed}
              onClick={() => setCodEnabled(!codEnabled)}
              className="shrink-0 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              ) : codEnabled ? (
                <ToggleRight className="h-8 w-8 text-green-600" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-gray-400" />
              )}
            </button>
          </div>

          {loadFailed ? (
            <div className="mt-4 rounded-lg px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-800">
              Could not read the current setting, so it is not shown above. Reload the page before
              changing anything.
            </div>
          ) : (
            <div
              className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                codEnabled
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}
            >
              {codEnabled
                ? 'Cash on Delivery is available to shoppers.'
                : 'Cash on Delivery is switched off. Checkout offers prepaid methods only.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
