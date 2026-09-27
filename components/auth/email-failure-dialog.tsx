'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MailWarning } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailFailureDialogProps {
  open: boolean
  /** Shown back to the customer so they can see the address we tried. */
  email?: string | null
  /** True while a retry is in flight. */
  busy?: boolean
  onRetry: () => void
  onClose: () => void
}

/**
 * Popup shown when a confirmation email could not be sent.
 *
 * This exists because the failure used to be invisible: the send was refused by
 * the provider, the server swallowed it, and the customer was shown "Check your
 * email" and left waiting on an inbox that would never receive anything. An
 * inline notice is easy to miss on a screen whose headline says the opposite, so
 * the failure interrupts instead.
 *
 * Same manners as `components/ui/confirm-dialog.tsx` — Escape closes, focus
 * lands on the safe action, the page behind cannot scroll, and the backdrop is
 * inert while a retry is on its way — but in the dark palette of the auth
 * screens it sits on top of.
 */
export function EmailFailureDialog({
  open,
  email,
  busy = false,
  onRetry,
  onClose,
}: EmailFailureDialogProps) {
  const retryRef = useRef<HTMLButtonElement>(null)
  // Drives the entrance transition: mount in the "from" state, flip next frame.
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [open])

  // Escape closes, unless a retry is already on its way.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onClose])

  // Retry is the action we want them to take, so it gets focus.
  useEffect(() => {
    if (open) retryRef.current?.focus()
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
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="email-failure-title"
      aria-describedby="email-failure-description"
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/70 transition-opacity duration-200 motion-reduce:transition-none',
          shown ? 'opacity-100' : 'opacity-0'
        )}
        onClick={busy ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          'relative w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl',
          'transition-all duration-200 ease-out motion-reduce:transition-none',
          shown
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-2 scale-95 opacity-0'
        )}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-950/60 text-amber-400 ring-1 ring-amber-800/70">
            <MailWarning className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2
              id="email-failure-title"
              className="text-base font-semibold text-white"
            >
              We couldn&apos;t send the email
            </h2>
            <p
              id="email-failure-description"
              className="mt-1.5 text-sm leading-relaxed text-gray-400"
            >
              {email ? (
                <>
                  The confirmation link to{' '}
                  <span className="font-medium text-gray-200">{email}</span>{' '}
                  didn&apos;t go out. This is a problem on our side, not with
                  your details — your account is saved. Please try again.
                </>
              ) : (
                <>
                  The confirmation link didn&apos;t go out. This is a problem on
                  our side, not with your details. Please try again.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50"
          >
            Close
          </button>

          <button
            ref={retryRef}
            type="button"
            onClick={onRetry}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-70"
          >
            {busy && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {busy ? 'Sending…' : 'Try again'}
          </button>
        </div>
      </div>
    </div>
  )
}
