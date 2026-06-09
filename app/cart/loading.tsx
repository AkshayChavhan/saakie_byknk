import { Skeleton } from '@/components/ui/skeleton'

// Cart transition skeleton: a list of line items on the left, order summary on
// the right — matching the cart page's two-column layout.
export default function CartLoading() {
  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="mb-8 h-8 w-40" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-lg border border-gray-100 p-4">
              <Skeleton className="h-24 w-20 rounded-md" />
              <div className="flex-1 space-y-3 py-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4 rounded-lg bg-gray-50 p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
