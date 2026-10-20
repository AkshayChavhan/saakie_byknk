'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { CalendarClock, X } from 'lucide-react'
import { PREBOOK_MESSAGE } from '@/lib/prebook'

interface PrebookButtonProps {
  /** Button text, e.g. "Pre-book - Rs. 1,850". */
  label: string
  /** Runs when the customer confirms inside the popover. */
  onConfirm: () => void
  /** True while the pre-booking is being placed (cart add + redirect). */
  busy?: boolean
  /** Which side of the button the popover opens on. */
  placement?: 'top' | 'bottom'
  /** `lg` for the main product column, `md` for the sticky phone bar. */
  size?: 'lg' | 'md'
  /** Extra classes for the wrapper, e.g. `flex-1` inside a flex bar. */
  className?: string
}

/**
 * Pre-book button for a sold-out saree. Clicking it opens a popover that
 * explains the 15–20 day wait, with the actual pre-booking behind a confirm
 * button, so the customer reads the delivery time before paying. Works the
 * same with touch, mouse and keyboard: Escape or a click outside closes it,
 * and focus returns to the button.
 */
export function PrebookButton({
  label,
  onConfirm,
  busy = false,
  placement = 'bottom',
  size = 'lg',
  className = '',
}: PrebookButtonProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()
  const titleId = useId()
  const bodyId = useId()

  const close = useCallback((returnFocus = true) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onPointer = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) close(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, close])

  const confirm = () => {
    setOpen(false)
    onConfirm()
  }

  const triggerSize = size === 'lg' ? 'py-4 px-6 text-lg' : 'py-3 px-4'
  const position = placement === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'
  const caret =
    placement === 'top'
      ? '-bottom-1.5 border-b border-r'
      : '-top-1.5 border-t border-l'

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        disabled={busy}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        className={`w-full bg-gray-900 text-white border border-gray-900 rounded-full font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${triggerSize}`}
      >
        {busy ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        ) : (
          <CalendarClock size={size === 'lg' ? 20 : 16} aria-hidden="true" />
        )}
        <span>{busy ? 'Pre-booking...' : label}</span>
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          className={`absolute left-0 right-0 z-40 ${position}`}
        >
          <div className="relative rounded-2xl bg-white p-5 text-left shadow-xl ring-1 ring-gray-200">
            <span
              className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white border-gray-200 ${caret}`}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => close()}
              className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <h3 id={titleId} className="pr-6 text-base font-semibold text-gray-900">
              {PREBOOK_MESSAGE.title}
            </h3>
            <div id={bodyId} className="mt-2 space-y-2 text-sm leading-relaxed text-gray-600">
              {PREBOOK_MESSAGE.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                ref={confirmRef}
                type="button"
                onClick={confirm}
                className="flex-1 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                Pre-book now
              </button>
              <button
                type="button"
                onClick={() => close()}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
