import { PREBOOK_DELIVERY_WINDOW } from '@/lib/prebook'

interface PrebookCapsuleProps {
  /** `sm` for the compact list-view thumbnail, `md` for the grid cards. */
  size?: 'sm' | 'md'
}

/**
 * "Pre-book now", shown under the "Out of Stock" capsule on a sold-out
 * product's photo in the listings. A sold-out saree can still be ordered
 * (lib/prebook.ts), so the listing should say so instead of letting the
 * shopper write the piece off. White on the dark overlay so it reads as the
 * way forward, with the delivery window on hover.
 */
export function PrebookCapsule({ size = 'md' }: PrebookCapsuleProps) {
  return (
    <span
      title={`Pre-book this saree: delivered ${PREBOOK_DELIVERY_WINDOW} after ordering`}
      className={`inline-flex items-center rounded-full bg-white font-semibold text-black shadow-lg ${
        size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'
      }`}
    >
      Pre-book now
    </span>
  )
}
