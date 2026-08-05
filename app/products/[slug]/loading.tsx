import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'

// Product detail transition skeleton: mirrors the two-column layout
// (square gallery on the left, title / price / actions on the right).
// Carries the header so the route never paints without chrome.
export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-4 lg:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <Skeleton className="aspect-square w-full rounded-lg" />

          {/* Details */}
          <div className="space-y-5">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-9 w-1/2" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-12 flex-1 rounded-lg" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
