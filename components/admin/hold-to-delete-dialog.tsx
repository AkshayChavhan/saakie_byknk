'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** How long the admin must keep the confirm button pressed. */
export const HOLD_DURATION_MS = 3000

interface HoldToDeleteDialogProps {
  open: boolean
  /** Name of the thing being deleted, quoted in the heading. */
  itemName: string
  /** What deleting actually destroys — be specific, this is the last warning. */
  description?: string
  /** True while the delete request is in flight. */
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Destructive-action dialog whose confirm button must be held down for three
 * seconds. A single mis-click cannot delete anything: releasing early resets
 * the timer and nothing is sent.
 */
export function HoldToDeleteDialog({
  open,
  itemName,
  description = 'This permanently removes the product and its images. This cannot be undone.',
  busy = false,
  onConfirm,
  onCancel,
}: HoldToDeleteDialogProps) {
  const [holding, setHolding] = useState(false)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const releaseHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    setHolding(false)
  }, [])

  const beginHold = useCallback(() => {
    // Ignore a second press while one is already counting down, and never
    // start one while the previous delete is still in flight.
    if (holdTimer.current || busy) return
    setHolding(true)
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null
      setHolding(false)
      onConfirm()
    }, HOLD_DURATION_MS)
  }, [busy, onConfirm])

  // Abandon any part-finished hold when the dialog goes away, so reopening it
  // never resumes a countdown the admin already walked away from.
  useEffect(() => {
    if (!open) releaseHold()
  }, [open, releaseHold])

  useEffect(() => releaseHold, [releaseHold])

  // Escape cancels, matching the dialog convention elsewhere in admin.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  // Focus lands on Cancel, not the destructive button.
  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hold-delete-title"
      aria-describedby="hold-delete-description"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={busy ? undefined : onCancel}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2
              id="hold-delete-title"
              className="text-lg font-semibold text-gray-900"
            >
              Delete &ldquo;{itemName}&rdquo;?
            </h2>
            <p
              id="hold-delete-description"
              className="mt-1 text-sm text-gray-600"
            >
              {description}
            </p>
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
            Cancel
          </button>

          <button
            type="button"
            disabled={busy}
            // Pointer events cover mouse, touch and pen with one path.
            onPointerDown={beginHold}
            onPointerUp={releaseHold}
            onPointerLeave={releaseHold}
            onPointerCancel={releaseHold}
            // Keyboard equivalent. `repeat` guards against the OS firing
            // keydown over and over while the key is held.
            onKeyDown={(event) => {
              if (event.repeat) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                beginHold()
              }
            }}
            onKeyUp={(event) => {
              if (event.key === 'Enter' || event.key === ' ') releaseHold()
            }}
            onBlur={releaseHold}
            onContextMenu={(event) => event.preventDefault()}
            className="relative select-none overflow-hidden rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-70 touch-none"
          >
            {/* Progress fill. Width is driven purely by a CSS transition, so it
                stays smooth without re-rendering on every frame — and snaps
                back instantly when the hold is released. */}
            <span
              data-testid="hold-progress"
              aria-hidden="true"
              className="absolute inset-y-0 left-0 bg-red-800"
              style={{
                width: holding ? '100%' : '0%',
                transition: holding
                  ? `width ${HOLD_DURATION_MS}ms linear`
                  : 'none',
              }}
            />
            <span className="relative flex items-center justify-center gap-2">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              {busy ? 'Deleting…' : holding ? 'Keep holding…' : 'Continue'}
            </span>
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-gray-500 sm:text-right" aria-live="polite">
          {busy
            ? 'Deleting, please wait…'
            : holding
              ? 'Keep holding to confirm — release to cancel.'
              : 'Press and hold Continue for 3 seconds to delete.'}
        </p>
      </div>
    </div>
  )
}
