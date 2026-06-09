import { ProductGridSkeleton } from '@/components/ui/skeleton'

// Shown while /categories loads. The category tiles share the same 3/4 aspect
// card shape as products, so the product grid skeleton is a faithful stand-in.
export default function CategoriesLoading() {
  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 h-8 w-56 animate-pulse rounded bg-gray-200" />
      <ProductGridSkeleton count={6} />
    </div>
  )
}
