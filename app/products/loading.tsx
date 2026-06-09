import { ProductGridSkeleton } from '@/components/ui/skeleton'

// Shown the instant /products is navigated to, while the page's data loads.
// Mirrors the products grid so the transition lands on the right shape rather
// than a frozen previous page.
export default function ProductsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-gray-200" />
      <ProductGridSkeleton count={8} />
    </div>
  )
}
