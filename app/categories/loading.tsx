import { ProductGridSkeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'

// Shown while /categories loads. The category tiles share the same 3/4 aspect
// card shape as products, so the product grid skeleton is a faithful stand-in.
// This is also the nearest Suspense boundary above /categories/[slug], so it
// carries the header too — without it the route flashes headerless chrome
// before the view mounts.
export default function CategoriesLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 h-8 w-56 animate-pulse rounded bg-gray-200" />
        <ProductGridSkeleton count={6} />
      </div>
    </div>
  )
}
