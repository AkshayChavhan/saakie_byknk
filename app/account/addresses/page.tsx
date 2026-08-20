'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Loader2, MapPin, Pencil, Plus, Trash2, User } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { PhoneInput } from '@/components/ui/phone-input'
import { isValidPhone } from '@/lib/phone'
import { INDIAN_STATES } from '@/lib/india-states'
import { districtsFor } from '@/lib/india-districts'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { userApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatAddressLine, type Address } from '@/components/cart/delivery-address'

const EMPTY_FORM = {
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
}

/**
 * Saved-address book under My Account. The same address list the cart and
 * checkout read — adding, deleting, or changing the default here is what
 * those pages see, because everything goes through /api/users/addresses.
 */
export default function SavedAddressesPage() {
  const { status } = useSession()
  const isLoaded = status !== 'loading'
  const isSignedIn = status === 'authenticated'
  const toast = useToast()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  // Address being edited; null while the form is adding a new one.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await userApi.getAddresses()
      setAddresses(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Failed to load addresses:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isSignedIn) load()
    else if (isLoaded) setLoading(false)
  }, [isLoaded, isSignedIn, load])

  const makeDefault = async (address: Address) => {
    if (savingId || address.isDefault) return
    setSavingId(address.id)
    try {
      const list = await userApi.setDefaultAddress(address.id)
      setAddresses(Array.isArray(list) ? list : [])
      toast.success('Default address updated')
    } catch (error) {
      toast.error(
        "Couldn't change the default",
        error instanceof Error ? error.message : 'Please try again.'
      )
    } finally {
      setSavingId(null)
    }
  }

  const startEdit = (address: Address) => {
    setForm({
      name: address.name,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? '',
      city: address.city,
      district: address.district ?? '',
      state: address.state,
      pincode: address.pincode,
    })
    setEditingId(address.id)
    setFormError(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormError(null)
    setForm(EMPTY_FORM)
  }

  const saveAddress = async (event: React.FormEvent) => {
    event.preventDefault()
    // PhoneInput shows the specific problem inline; this only blocks the save.
    if (!form.phone || !isValidPhone(form.phone)) {
      setFormError('Please enter a valid phone number.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        const list = await userApi.updateAddress(editingId, form)
        setAddresses(Array.isArray(list) ? list : [])
        toast.success('Address updated')
      } else {
        await userApi.addAddress(form)
        await load()
        toast.success('Address added')
      }
      closeForm()
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not save the address'
      )
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      const list = await userApi.deleteAddress(deleteTarget.id)
      setAddresses(Array.isArray(list) ? list : [])
      // The form may be editing the row that just went away.
      if (editingId === deleteTarget.id) closeForm()
      setDeleteTarget(null)
      toast.success('Address deleted')
    } catch (error) {
      setDeleteTarget(null)
      toast.error(
        "Couldn't delete the address",
        error instanceof Error ? error.message : 'Please try again.'
      )
    } finally {
      setDeleting(false)
    }
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <User className="h-12 w-12 text-gray-300" />
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Please sign in</h1>
          <p className="mt-2 text-sm text-gray-500">Sign in to manage your saved addresses.</p>
          <Link href="/sign-in?callbackUrl=%2Faccount%2Faddresses" className="btn-primary mt-6">
            Sign In
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-6 sm:px-8 py-8 max-w-3xl">
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          My Account
        </Link>

        <div className="mt-3 mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Saved Addresses</h1>
          {!showForm && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setForm(EMPTY_FORM)
                setFormError(null)
                setShowForm(true)
              }}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <Plus size={16} /> Add address
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={saveAddress} className="card p-5 mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <h2 className="text-base font-semibold text-gray-900 sm:col-span-2">
              {editingId ? 'Edit address' : 'Add a new address'}
            </h2>
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
                {formError}
              </div>
            )}
            <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <PhoneInput value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
            <input className="input sm:col-span-2" placeholder="Address line 1" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} required />
            <input className="input sm:col-span-2" placeholder="Address line 2" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} required />
            <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            <select
              className={cn('input', !form.state && 'text-gray-400')}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value, district: '' })}
              required
              aria-label="State"
            >
              <option value="" disabled>State</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state} className="text-gray-900">
                  {state}
                </option>
              ))}
            </select>
            <select
              className={cn('input', !form.district && 'text-gray-400')}
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              required
              disabled={!form.state}
              aria-label="District"
            >
              <option value="" disabled>
                {form.state ? 'District' : 'District (choose a state first)'}
              </option>
              {districtsFor(form.state).map((district) => (
                <option key={district} value={district} className="text-gray-900">
                  {district}
                </option>
              ))}
            </select>
            <input className="input" placeholder="Pincode (6 digits)" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} required />
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save address'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="card p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : addresses.length === 0 && !showForm ? (
          <div className="card p-8 text-center">
            <MapPin className="h-10 w-10 text-gray-300 mx-auto" />
            <p className="mt-3 text-sm text-gray-600">
              No saved addresses yet. Add one so checkout is a single tap.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <div key={address.id} className="card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium text-gray-900">
                      {address.name}
                      <span className="font-normal text-gray-500"> · {address.phone}</span>
                      {address.isDefault && (
                        <span className="ml-2 rounded-full bg-gray-900 px-2 py-0.5 text-[11px] font-medium text-white align-middle">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-gray-600">
                      {formatAddressLine(address)} {address.pincode}
                    </p>
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => makeDefault(address)}
                        disabled={!!savingId}
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 transition-colors"
                      >
                        {savingId === address.id && (
                          <Loader2 size={13} className="animate-spin" />
                        )}
                        Set as default
                      </button>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(address)}
                      disabled={!!savingId || deleting}
                      aria-label={`Edit address for ${address.name}`}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(address)}
                      disabled={!!savingId || deleting}
                      aria-label={`Delete address for ${address.name}`}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Do you want to delete this address?"
        description={
          deleteTarget
            ? `${deleteTarget.name}, ${formatAddressLine(deleteTarget)} ${deleteTarget.pincode}`
            : ''
        }
        confirmLabel="Yes, delete"
        cancelLabel="No"
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
