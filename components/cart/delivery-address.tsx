'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Loader2, MapPin, Plus, Trash2, X } from 'lucide-react'
import { userApi } from '@/lib/api'
import { INDIAN_STATES } from '@/lib/india-states'
import { PhoneInput } from '@/components/ui/phone-input'
import { isValidPhone } from '@/lib/phone'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export interface Address {
  id: string
  name: string
  phone: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  pincode: string
  isDefault: boolean
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
}

/** "Flat 1005, Block A, Pune, Maharashtra" — everything but the pincode. */
export function formatAddressLine(address: Address): string {
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * The "Deliver to" bar at the top of the cart.
 *
 * Shows the address an order would actually ship to — the one flagged
 * `isDefault` — and lets the customer switch. Switching promotes the chosen
 * address to default rather than holding a selection in local state, so what
 * the cart shows, what checkout pre-selects and what lands on the order are by
 * construction the same address; there is no second source of truth to drift.
 */
export function DeliveryAddress() {
  const { status } = useSession()
  const toast = useToast()
  const isSignedIn = status === 'authenticated'

  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Address | null>(null)
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
    else if (status !== 'loading') setLoading(false)
  }, [isSignedIn, status, load])

  // The list arrives default-first, but read the flag rather than trusting
  // position — an account with no default at all must not silently show the
  // first address as though it were chosen.
  const selected = addresses.find((a) => a.isDefault) ?? addresses[0]

  const choose = async (addressId: string) => {
    if (savingId) return
    setSavingId(addressId)
    try {
      const list = await userApi.setDefaultAddress(addressId)
      setAddresses(Array.isArray(list) ? list : [])
      setPickerOpen(false)
      toast.success('Delivery address updated')
    } catch (error) {
      toast.error(
        "Couldn't change the address",
        error instanceof Error ? error.message : 'Please try again.'
      )
    } finally {
      setSavingId(null)
    }
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
      const created = await userApi.addAddress(form)
      setForm(EMPTY_FORM)
      setShowForm(false)
      // The very first address a user saves is created as their default, so
      // there is nothing more to promote. Any later one has to be asked for
      // explicitly, which is what a customer adding an address here means.
      if (created?.isDefault) {
        await load()
        setPickerOpen(false)
        toast.success('Address added')
      } else {
        await choose(created.id)
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not save the address'
      )
    } finally {
      setSaving(false)
    }
  }

  const removeAddress = async () => {
    if (!confirmDelete || deleting) return
    setDeleting(true)
    try {
      const list = await userApi.deleteAddress(confirmDelete.id)
      setAddresses(Array.isArray(list) ? list : [])
      setConfirmDelete(null)
      toast.success('Address deleted')
    } catch (error) {
      toast.error(
        "Couldn't delete the address",
        error instanceof Error ? error.message : 'Please try again.'
      )
    } finally {
      setDeleting(false)
    }
  }

  // Close on Escape while the picker is up — the delete confirmation first,
  // then the picker itself.
  useEffect(() => {
    if (!pickerOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || savingId || saving || deleting) return
      if (confirmDelete) setConfirmDelete(null)
      else setPickerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [pickerOpen, savingId, saving, deleting, confirmDelete])

  if (status === 'loading' || (isSignedIn && loading)) {
    return <div className="card mb-4 h-[68px] animate-pulse bg-gray-100" />
  }

  if (!isSignedIn) {
    return (
      <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-gray-600">
          Sign in to choose where this order should go.
        </p>
        <Link href="/sign-in?callbackUrl=%2Fcart" className="btn-secondary text-sm">
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="card mb-4 flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <MapPin size={18} className="mt-0.5 shrink-0 text-gray-500" aria-hidden="true" />
          {selected ? (
            <div className="min-w-0">
              <p className="text-sm text-gray-900">
                <span className="text-gray-600">Deliver to: </span>
                <span className="font-medium">{selected.name}</span>
                <span className="font-medium">, {selected.pincode}</span>
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {formatAddressLine(selected)}
              </p>
            </div>
          ) : (
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">
                No delivery address yet
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Add one so we know where to send your order.
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm(addresses.length === 0)
            setPickerOpen(true)
          }}
          className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
        >
          {selected ? 'Change' : 'Add address'}
        </button>
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delivery-address-title"
        >
          <div
            className="absolute inset-0 bg-black/60 animate-overlay-in"
            onClick={savingId || saving ? undefined : () => setPickerOpen(false)}
            aria-hidden="true"
          />

          <div className="animate-panel-in relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2
                id="delivery-address-title"
                className="text-base font-semibold text-gray-900"
              >
                {showForm ? 'Add a delivery address' : 'Choose a delivery address'}
              </h2>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                disabled={!!savingId || saving}
                aria-label="Close"
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!showForm && (
                <div className="flex flex-col gap-2">
                  {addresses.map((address) => {
                    const isSelected = address.id === selected?.id
                    return (
                      <div
                        key={address.id}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border p-3 transition-colors',
                          isSelected
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-400'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => choose(address.id)}
                          disabled={!!savingId}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:opacity-60"
                        >
                          <span
                            className={cn(
                              'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                              isSelected ? 'border-gray-900' : 'border-gray-300'
                            )}
                            aria-hidden="true"
                          >
                            {isSelected && (
                              <span className="h-2 w-2 rounded-full bg-gray-900" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="font-medium text-gray-900">
                              {address.name}
                            </span>
                            <span className="text-gray-500"> · {address.phone}</span>
                            {address.isDefault && (
                              <span className="ml-2 rounded-full bg-gray-900 px-2 py-0.5 text-[11px] font-medium text-white">
                                Default
                              </span>
                            )}
                            <span className="mt-0.5 block text-gray-600">
                              {formatAddressLine(address)} {address.pincode}
                            </span>
                          </span>
                        </button>
                        {savingId === address.id && (
                          <Loader2
                            size={16}
                            className="mt-0.5 shrink-0 animate-spin text-gray-500"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(address)}
                          disabled={!!savingId || deleting}
                          aria-label={`Delete address for ${address.name}`}
                          className="mt-0.5 shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="mt-1 inline-flex items-center gap-1.5 self-start text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
                  >
                    <Plus size={16} /> Add a new address
                  </button>
                </div>
              )}

              {showForm && (
                <form onSubmit={saveAddress} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
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
                  <input className="input sm:col-span-2" placeholder="Pincode (6 digits)" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} required />
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      {saving && <Loader2 size={15} className="animate-spin" />}
                      {saving ? 'Saving…' : 'Save and deliver here'}
                    </button>
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false)
                          setFormError(null)
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            {confirmDelete && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-t-2xl bg-black/40 p-4 sm:rounded-2xl">
                <div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="delete-address-title"
                  className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
                >
                  <h3
                    id="delete-address-title"
                    className="text-base font-semibold text-gray-900"
                  >
                    Do you want to delete this address?
                  </h3>
                  <p className="mt-1.5 text-sm text-gray-600">
                    {confirmDelete.name}, {formatAddressLine(confirmDelete)}{' '}
                    {confirmDelete.pincode}
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      disabled={deleting}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={removeAddress}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                    >
                      {deleting && <Loader2 size={14} className="animate-spin" />}
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
