import { cn } from '@/lib/utils'

/**
 * Skeleton — a single shimmering placeholder block. Compose these to mimic the
 * shape of content while it loads. Uses the `shimmer` utility (defined in
 * globals.css) for a left-to-right sheen rather than a flat pulse, which reads
 * as "loading" more clearly on a premium storefront.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-md bg-gray-200/80',
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:animate-[shimmer_1.6s_infinite]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
        className
      )}
    />
  )
}

/**
 * ProductCardSkeleton — matches the shape of a product card in the grid
 * (image + title + rating + price), so route transitions land on a layout that
 * mirrors the real content instead of a blank screen.
 */
export function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[3/4] w-full rounded-lg" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

/**
 * ProductGridSkeleton — a full grid of card skeletons. `count` defaults to 8,
 * matching a typical first paint of the products / category pages.
 */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}
