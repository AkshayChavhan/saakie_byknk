'use client'

import { forwardRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Button — the shared, interactive button for the storefront.
 *
 * What it gives every button for free:
 *  - a tactile press (scale-down on click) via `.btn-press`
 *  - a material-style ink ripple radiating from the click point via `.ripple`
 *  - a built-in `loading` state: shows a spinner, swaps the label for
 *    `loadingText` (if given), and disables interaction
 *
 * Variants intentionally mirror the existing `.btn-*` utilities and the app's
 * saree palette so adoption is a drop-in. Built on a native <button>, so all
 * standard button props (type, onClick, aria-*, etc.) pass straight through.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'maroon' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<Variant, string> = {
  // Dark, high-emphasis — the app's default primary action.
  primary:
    'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg disabled:hover:bg-gray-900',
  // Light, bordered — secondary actions.
  secondary:
    'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 hover:shadow-md',
  // Transparent — tertiary / inline actions.
  ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50',
  // Saree-palette maroon — used for branded calls to action (auth, etc.).
  maroon:
    'bg-gradient-to-r from-maroon-700 to-maroon-600 text-marigold-50 shadow-lg shadow-maroon-900/20 hover:from-maroon-800 hover:to-maroon-700 hover:shadow-xl',
  // Bordered red outline — e.g. "buy" alternatives.
  outline:
    'bg-transparent text-primary-600 border border-primary-600 hover:bg-primary-50',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  /** Replaces the children while `loading` is true (e.g. "Adding…"). */
  loadingText?: React.ReactNode
  /** Optional leading icon (hidden while loading — the spinner takes its place). */
  leftIcon?: React.ReactNode
  /** Stretch to the full width of the parent. */
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      leftIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    // Drives the `data-rippling` attribute that triggers the CSS ripple animation.
    const [rippling, setRippling] = useState(false)

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return

      // Position the ripple origin at the click point (relative to the button).
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      e.currentTarget.style.setProperty('--ripple-x', `${x}px`)
      e.currentTarget.style.setProperty('--ripple-y', `${y}px`)

      // Re-trigger the animation even on rapid repeated clicks.
      setRippling(false)
      requestAnimationFrame(() => setRippling(true))

      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        onClick={handleClick}
        onAnimationEnd={() => setRippling(false)}
        data-rippling={rippling ? 'true' : 'false'}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          // base
          'btn-press ripple relative inline-flex items-center justify-center rounded-full font-medium tracking-wide',
          'transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900/40',
          'disabled:cursor-not-allowed disabled:opacity-60',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        <span>{loading && loadingText ? loadingText : children}</span>
      </button>
    )
  }
)

Button.displayName = 'Button'
