import { Star } from 'lucide-react'

/**
 * Marketplace-style rating chip: bold score, green star, hairline divider,
 * then the review count — the pattern Indian shoppers know from Flipkart and
 * Swiggy. It replaces the five-star rows and loose yellow stars that each
 * product surface had grown its own version of.
 *
 * A single star beats five here: at card size a five-star row reads as texture
 * rather than a number, and it cannot show the fractional part that the score
 * carries.
 */
export function RatingBadge({
  rating,
  reviews,
  size = 'sm',
  className = '',
}: {
  rating: number
  reviews: number
  size?: 'sm' | 'md'
  className?: string
}) {
  // Unrated products show nothing rather than a hollow "0.0" chip.
  if (!rating || rating <= 0) return null

  const sm = size === 'sm'

  return (
    <span
      className={`inline-flex items-center rounded-lg bg-white shadow-sm ring-1 ring-gray-200/70 ${
        sm ? 'gap-1 px-2 py-1' : 'gap-1.5 rounded-xl px-3 py-1.5'
      } ${className}`}
      // The visual chip is decorative shorthand; screen readers get the full sentence.
      aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${reviews} ${
        reviews === 1 ? 'review' : 'reviews'
      }`}
    >
      <span
        aria-hidden="true"
        className={`font-bold text-gray-900 ${sm ? 'text-xs' : 'text-base'}`}
      >
        {rating.toFixed(1)}
      </span>
      <Star
        aria-hidden="true"
        size={sm ? 12 : 16}
        className="fill-current text-green-700"
      />
      <span
        aria-hidden="true"
        className={`w-px bg-gray-300 ${sm ? 'mx-0.5 h-3' : 'mx-1 h-4'}`}
      />
      <span
        aria-hidden="true"
        className={`text-gray-600 ${sm ? 'text-xs' : 'text-sm'}`}
      >
        {reviews.toLocaleString('en-IN')}
      </span>
    </span>
  )
}
