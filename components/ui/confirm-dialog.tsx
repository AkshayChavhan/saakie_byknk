'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  /** Asks the question. Phrase it so "Yes" is an unambiguous answer. */
  title: string
  /** What actually happens, in plain words. */
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Label while the request is in flight. */
  busyLabel?: string
  /** Red confirm button for destructive answers, neutral otherwise. */
  tone?: 'danger' | 'default'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A plain yes/no confirmation.
 *
 * The deliberate counterpart to `components/admin/hold-to-delete-dialog.tsx`:
 * that one guards an admin destroying catalogue data for everyone and makes you
 * hold the button for three seconds. This one guards a customer's own reversible
 * housekeeping, where a three-second hold would be an obstacle rather than a
 * safeguard. Both keep the same manners — Escape closes, focus starts on the
 * safe button, the backdrop is inert while a request is in flight.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  busyLabel = 'Working…',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  // Drives the entrance transition: the dialog mounts in its "from" state and
  // is flipped on the next frame, so the browser has something to animate from.
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [open])

  // Escape closes, unless a request is already on its way.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onCancel])

  // Focus the safe answer, never the destructive one.
  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  // Stop the page behind the dialog from scrolling under it.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? 'confirm-dialog-description' : undefined}
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/60 transition-opacity duration-200 motion-reduce:transition-none',
          shown ? 'opacity-100' : 'opacity-0'
        )}
        onClick={busy ? undefined : onCancel}
        aria-hidden="true"
      />

      <div
        className={cn(
          'relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl',
          'transition-all duration-200 ease-out motion-reduce:transition-none',
          shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full',
              tone === 'danger' ? 'bg-red-100' : 'bg-gray-100'
            )}
          >
            <AlertTriangle
              className={cn(
                'h-6 w-6',
                tone === 'danger' ? 'text-red-600' : 'text-gray-600'
              )}
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-gray-900"
            >
              {title}
            </h2>
            {description && (
              <p
                id="confirm-dialog-description"
                className="mt-1 text-sm text-gray-600"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70',
              tone === 'danger'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-gray-900 hover:bg-gray-800 focus:ring-gray-500'
            )}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
